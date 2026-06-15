# Ranking Points Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Punkty" tab on `/ranking` that renders a fog-style cumulative-points chart for all ~80 users, with tiered line opacity, always-visible "me" + favourites lines, and a multi-select legend.

**Architecture:** New `RankingPointsChart` component (mirrors `RankingBumpChart` structure) added to the existing tab system in `RankingPage`. Y-axis = cumulative points (already in API). All 80 lines rendered in SVG z-order passes so "me" and favourites always appear on top. Multi-select highlight state uses `Set<number>` instead of a single nullable ID.

**Tech Stack:** React, Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, `ReferenceLine`, `ResponsiveContainer`), TypeScript, Tailwind CSS.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `frontend/src/pages/RankingPage.tsx` | Modify | Add `'points'` to view union type, add third tab, render `RankingPointsChart` |
| `frontend/src/components/RankingPointsChart.tsx` | Create | New component — all chart logic |

---

## Task 1: Extend RankingPage tab system

**Files:**
- Modify: `frontend/src/pages/RankingPage.tsx`

- [ ] **Add import for new component** (top of file, after the existing `RankingBumpChart` import):

```typescript
import RankingPointsChart from '@/components/RankingPointsChart'
```

- [ ] **Replace the view type and parser** (lines 72-74, currently):

```typescript
// BEFORE
const view: 'table' | 'chart' = searchParams.get('view') === 'chart' ? 'chart' : 'table'
const selectView = (next: 'table' | 'chart') =>
  setSearchParams(next === 'chart' ? { view: 'chart' } : {}, { replace: true })
```

Replace with:

```typescript
type View = 'table' | 'chart' | 'points'
function parseView(param: string | null): View {
  if (param === 'chart') return 'chart'
  if (param === 'points') return 'points'
  return 'table'
}
const view = parseView(searchParams.get('view'))
const selectView = (next: View) =>
  setSearchParams(next === 'table' ? {} : { view: next }, { replace: true })
```

- [ ] **Add third tab button** (after the existing "Wykres pozycji" button in the tab bar):

```tsx
<button
  type="button"
  onClick={() => selectView('points')}
  className={`tab${view === 'points' ? ' tab-active' : ''}`}
>
  Punkty
</button>
```

- [ ] **Update the bottom render branch** (currently `view === 'table' ? ... : <RankingBumpChart ...>`):

```tsx
{view === 'table' ? (
  <div className="mx-auto max-w-xl">
    {/* ... existing table content unchanged ... */}
  </div>
) : view === 'chart' ? (
  <RankingBumpChart enabled={view === 'chart'} />
) : (
  <RankingPointsChart enabled={view === 'points'} />
)}
```

- [ ] **Verify TypeScript compiles** — run from `frontend/`:

```bash
npx tsc --noEmit
```

Expected: no errors (component doesn't exist yet → will error on import; create a stub first if needed, or skip until Task 2).

- [ ] **Commit:**

```bash
git add frontend/src/pages/RankingPage.tsx
git commit -m "Add Punkty tab to ranking page"
```

---

## Task 2: Create RankingPointsChart — structure, axes, data rows

**Files:**
- Create: `frontend/src/components/RankingPointsChart.tsx`

- [ ] **Create the file with imports, constants, and helper functions:**

```typescript
import { useState } from 'react'
import {
  LineChart, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useRankingHistory } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/lib/settings'
import { ErrorBox, Loading } from '@/components/Status'
import { formatDateLong, formattedScore, pointsDisplay } from '@/lib/format'
import type { RankingHistoryMatch, RankingHistorySeries } from '@/api/types'

const COL_PX = 20
const MAX_X_TICKS = 12
const MOBILE_CHART_HEIGHT = 320
const DESKTOP_CHART_HEIGHT_PER_USER = 14
const DESKTOP_CHART_MIN_HEIGHT = 500

function tierColor(finalRank: number, total: number): string {
  const frac = finalRank / total
  if (frac <= 0.15) return '#34d399'
  if (frac <= 0.65) return '#6b7280'
  return '#f87171'
}

function tierOpacity(finalRank: number, total: number): number {
  return finalRank / total <= 0.15 ? 0.20 : 0.12
}

function xTicks(matchCount: number): number[] {
  if (matchCount <= MAX_X_TICKS) return Array.from({ length: matchCount }, (_, i) => i + 1)
  const ticks: number[] = [1]
  const step = (matchCount - 1) / (MAX_X_TICKS - 1)
  for (let i = 1; i < MAX_X_TICKS - 1; i++) ticks.push(Math.round(1 + i * step))
  ticks.push(matchCount)
  return ticks
}
```

- [ ] **Add the component skeleton** (after the helpers):

```tsx
interface Props {
  enabled: boolean
}

export default function RankingPointsChart({ enabled }: Props) {
  const { data, isLoading, isError } = useRankingHistory(enabled)
  const { user: me } = useAuth()
  const { favoriteUserIds } = useSettings()
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set())
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const { matches, series } = data

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak zakończonych meczów</div>
  }

  const favorites = new Set(favoriteUserIds)
  const totalUsers = series.length
  const lastIdx = matches.length - 1
  const rewarded = me?.rewarded_positions ?? 0

  // Final rank for each user (from last match's positions array)
  const finalRankMap = new Map(series.map(s => [s.user.id, s.positions[lastIdx] ?? totalUsers]))

  // userMap for tooltip name lookup
  const userMap = new Map(series.map(s => [String(s.user.id), s.user.username]))

  // Legend list: alphabetical
  const sortedSeries = [...series].sort((a, b) =>
    a.user.username.localeCompare(b.user.username, undefined, { sensitivity: 'base' })
  )

  // recharts data rows: { x: matchNumber, [userId]: cumulativePoints }
  type Row = { x: number } & Record<string, number>
  const rows: Row[] = matches.map((_, i) => {
    const row: Row = { x: i + 1 }
    series.forEach(s => { row[String(s.user.id)] = s.points[i] })
    return row
  })

  // Y-axis domain: 0 to the highest cumulative points reached by any user
  const globalMax = Math.max(...series.flatMap(s => s.points))

  // Prize zone reference line: minimum points of users inside the prize zone at the last match
  const inPrize = rewarded > 0
    ? series.filter(s => s.positions[lastIdx] <= rewarded)
    : []
  const prizePoints = inPrize.length > 0
    ? Math.min(...inPrize.map(s => s.points[lastIdx]))
    : null

  // Toggle / clear highlight
  const toggleHighlight = (id: number) =>
    setHighlightedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearHighlight = () => setHighlightedIds(new Set())

  const chartWidth = Math.max(matches.length * COL_PX, 600)
  const desktopChartHeight = Math.max(DESKTOP_CHART_MIN_HEIGHT, totalUsers * DESKTOP_CHART_HEIGHT_PER_USER)
  const xDomain: [number, number] = matches.length === 1 ? [0.5, 1.5] : [1, matches.length]

  const chart = (
    <LineChart
      data={rows}
      margin={{ top: 20, right: 40, bottom: 16, left: 8 }}
      onMouseLeave={() => setHoveredUserId(null)}
    >
      <CartesianGrid horizontal vertical={false} strokeDasharray="4 4" stroke="#E4E4E4" />
      <XAxis dataKey="x" type="number" domain={xDomain} ticks={xTicks(matches.length)} />
      <YAxis domain={[0, globalMax]} allowDecimals={false} width={40}
        tickFormatter={(v: number) => pointsDisplay(v)} />
      {prizePoints != null && rewarded > 0 && (
        <ReferenceLine
          y={prizePoints}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: 'strefa nagród', position: 'insideTopLeft', fill: '#b45309', fontSize: 10 }}
        />
      )}
      <Tooltip
        content={
          <CustomTooltip
            matches={matches}
            series={series}
            userMap={userMap}
            meId={me?.id}
            hoveredUserId={hoveredUserId}
          />
        }
      />
      {/* Lines rendered in Task 3 */}
    </LineChart>
  )

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="card overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 16 }}>
              <span
                className="text-[10px] font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Punkty
              </span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div style={{ minWidth: chartWidth }}>
                <ResponsiveContainer width="100%" height={MOBILE_CHART_HEIGHT}>
                  {chart}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[10px] font-medium text-muted">Numer meczu</p>
        </div>
        <div className="card mt-3 overflow-hidden">
          <button
            type="button"
            onClick={() => setLegendOpen(o => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
          >
            <span>
              <i className="fas fa-list mr-2 text-muted" aria-hidden="true" />
              Gracze
              {highlightedIds.size > 0 && (
                <span className="ml-2 text-xs font-normal text-brand">
                  ({highlightedIds.size} zaznaczonych)
                </span>
              )}
            </span>
            <i className={`fas fa-chevron-${legendOpen ? 'up' : 'down'} text-muted`} aria-hidden="true" />
          </button>
          {legendOpen && (
            <div className="border-t border-line">
              <Legend
                sortedSeries={sortedSeries}
                finalRankMap={finalRankMap}
                totalUsers={totalUsers}
                highlightedIds={highlightedIds}
                favorites={favorites}
                meId={me?.id}
                onToggle={toggleHighlight}
                onClear={clearHighlight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div className="card min-w-0 flex-1 overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 20 }}>
              <span
                className="text-xs font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Skumulowane punkty
              </span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div style={{ minWidth: chartWidth }}>
                <ResponsiveContainer width="100%" height={desktopChartHeight}>
                  {chart}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-xs font-medium text-muted">Numer meczu</p>
        </div>
        <div className="card w-48 shrink-0 overflow-hidden">
          <Legend
            sortedSeries={sortedSeries}
            finalRankMap={finalRankMap}
            totalUsers={totalUsers}
            highlightedIds={highlightedIds}
            favorites={favorites}
            meId={me?.id}
            onToggle={toggleHighlight}
            onClear={clearHighlight}
            maxHeight={desktopChartHeight}
          />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Add a stub `CustomTooltip` and `Legend` below the helpers** (just enough to compile — full implementations come in Tasks 4 and 5):

```tsx
function CustomTooltip(_props: unknown) { return null }

interface LegendProps {
  sortedSeries: RankingHistorySeries[]
  finalRankMap: Map<number, number>
  totalUsers: number
  highlightedIds: Set<number>
  favorites: Set<number>
  meId?: number
  onToggle: (id: number) => void
  onClear: () => void
  maxHeight?: number
}
function Legend(_props: LegendProps) { return null }
```

- [ ] **Verify TypeScript compiles:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add frontend/src/components/RankingPointsChart.tsx frontend/src/pages/RankingPage.tsx
git commit -m "Add RankingPointsChart scaffold with axes and layout"
```

---

## Task 3: Add fog line rendering

**Files:**
- Modify: `frontend/src/components/RankingPointsChart.tsx`

- [ ] **Add the `getLineProps` helper** (after the `xTicks` function, before the component):

```typescript
function getLineProps(
  s: RankingHistorySeries,
  meId: number | undefined,
  favorites: Set<number>,
  highlightedIds: Set<number>,
  finalRankMap: Map<number, number>,
  totalUsers: number,
): { stroke: string; strokeWidth: number; strokeOpacity: number } {
  const uid = s.user.id
  const finalRank = finalRankMap.get(uid) ?? totalUsers
  const anyHighlighted = highlightedIds.size > 0

  if (uid === meId)             return { stroke: '#12A751', strokeWidth: 2.5, strokeOpacity: 1 }
  if (favorites.has(uid))       return { stroke: '#f59e0b', strokeWidth: 1.8, strokeOpacity: 1 }
  if (highlightedIds.has(uid))  return { stroke: tierColor(finalRank, totalUsers), strokeWidth: 2,   strokeOpacity: 1 }
  if (anyHighlighted)           return { stroke: tierColor(finalRank, totalUsers), strokeWidth: 1,   strokeOpacity: 0.05 }
  return                               { stroke: tierColor(finalRank, totalUsers), strokeWidth: 1,   strokeOpacity: tierOpacity(finalRank, totalUsers) }
}
```

- [ ] **Add the `makeEndDot` helper** (after `getLineProps`):

```typescript
interface DotProps { cx?: number; cy?: number; index?: number }

function makeEndDot(rank: number, color: string, lastMatchIdx: number) {
  return function EndDot({ cx, cy, index }: DotProps) {
    if (cx == null || cy == null || index !== lastMatchIdx) return null
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={color} />
        <text x={cx + 5} y={cy + 4} fontSize={9} fill={color} fontWeight={700}>{`#${rank}`}</text>
      </g>
    )
  }
}
```

- [ ] **Replace the `{/* Lines rendered in Task 3 */}` comment** inside the `<LineChart>` with the actual line rendering. Add this block immediately before `</LineChart>`:

```tsx
{/* Render order: dim fog lines first, favourites second, me last (SVG painters order) */}
{[...series]
  .sort((a, b) => {
    const rank = (s: RankingHistorySeries) => {
      if (s.user.id === me?.id)      return 3
      if (favorites.has(s.user.id))  return 2
      if (highlightedIds.has(s.user.id)) return 1
      return 0
    }
    return rank(a) - rank(b)
  })
  .map(s => {
    const uid = String(s.user.id)
    const props = getLineProps(s, me?.id, favorites, highlightedIds, finalRankMap, totalUsers)
    const finalRank = finalRankMap.get(s.user.id) ?? totalUsers
    const showEndLabel = finalRank <= 3 && s.user.id !== me?.id && !favorites.has(s.user.id)

    return (
      <Line
        key={uid}
        dataKey={uid}
        stroke={props.stroke}
        strokeWidth={props.strokeWidth}
        strokeOpacity={props.strokeOpacity}
        dot={showEndLabel ? makeEndDot(finalRank, props.stroke, lastIdx) : false}
        activeDot={{
          r: 4,
          onMouseEnter: () => setHoveredUserId(uid),
          onMouseLeave: () => setHoveredUserId(null),
        }}
        isAnimationActive={false}
        connectNulls
      />
    )
  })}
```

- [ ] **Verify TypeScript compiles:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add frontend/src/components/RankingPointsChart.tsx
git commit -m "Add tiered fog line rendering to RankingPointsChart"
```

---

## Task 4: Implement multi-select Legend

**Files:**
- Modify: `frontend/src/components/RankingPointsChart.tsx`

- [ ] **Replace the stub `Legend` function** with the full implementation:

```tsx
function Legend({ sortedSeries, finalRankMap, totalUsers, highlightedIds, favorites, meId, onToggle, onClear, maxHeight }: LegendProps) {
  return (
    <div>
      {highlightedIds.size > 0 && (
        <div className="border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-brand hover:underline"
          >
            Wyczyść ({highlightedIds.size})
          </button>
        </div>
      )}
      <ul
        className="divide-y divide-line/60"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {sortedSeries.map(s => {
          const uid = s.user.id
          const finalRank = finalRankMap.get(uid) ?? totalUsers
          const isMe = uid === meId
          const isFav = favorites.has(uid)
          const isSelected = highlightedIds.has(uid)
          const lineColor = isMe ? '#12A751' : isFav ? '#f59e0b' : tierColor(finalRank, totalUsers)

          return (
            <li key={uid}>
              <button
                type="button"
                onClick={() => onToggle(uid)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  isSelected ? 'bg-surface font-semibold' : ''
                }`}
              >
                <span
                  className="inline-block h-2.5 w-4 shrink-0 rounded-sm"
                  style={{ backgroundColor: lineColor, opacity: isSelected || isMe || isFav ? 1 : 0.5 }}
                />
                <span className={`flex-1 truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
                  {s.user.username}
                  {isMe && <span className="ml-1 text-[10px] font-normal">(Ty)</span>}
                  {isFav && !isMe && <span className="ml-1 text-yellow-500">★</span>}
                </span>
                {isSelected && (
                  <i className="fas fa-check text-brand" aria-hidden="true" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add frontend/src/components/RankingPointsChart.tsx
git commit -m "Implement multi-select legend in RankingPointsChart"
```

---

## Task 5: Implement Tooltip

**Files:**
- Modify: `frontend/src/components/RankingPointsChart.tsx`

- [ ] **Replace the stub `CustomTooltip`** with the full implementation (place it before the `Legend` component):

```tsx
interface PayloadEntry {
  dataKey: string
  value: number
  stroke: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: number
  payload?: PayloadEntry[]
  matches: RankingHistoryMatch[]
  series: RankingHistorySeries[]
  userMap: Map<string, string>
  meId?: number
  hoveredUserId: string | null
}

function CustomTooltip({ active, label, payload, matches, series, userMap, meId, hoveredUserId }: CustomTooltipProps) {
  if (!active || label == null || !payload?.length) return null
  const match = matches[label - 1]
  if (!match) return null

  const matchIdx = label - 1
  const score =
    match.result_a != null && match.result_b != null
      ? formattedScore(match.result_a, match.result_b)
      : '–:–'

  const hoveredEntry = hoveredUserId ? payload.find(p => p.dataKey === hoveredUserId) : null
  if (!hoveredEntry) return null

  const uid = parseInt(hoveredEntry.dataKey, 10)
  const userSeries = series.find(s => s.user.id === uid)
  const pts = userSeries?.points[matchIdx] ?? hoveredEntry.value
  const pos = userSeries?.positions[matchIdx] ?? null
  const isMe = hoveredEntry.dataKey === String(meId)

  return (
    <div className="card card-body w-52 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">
        Mecz #{label}: {match.team_a} {score} {match.team_b}
      </p>
      <p className="text-muted">{formatDateLong(match.start)}</p>
      <div className="mt-2 border-t border-line pt-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: hoveredEntry.stroke }}
          />
          <span className={`truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
            {userMap.get(hoveredEntry.dataKey) ?? '—'}
          </span>
        </div>
        <p className="mt-1 font-bold text-ink tabular-nums">
          {pointsDisplay(pts)} pkt
          {pos != null && (
            <span className="ml-2 text-xs font-normal text-muted">({pos}. miejsce)</span>
          )}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add frontend/src/components/RankingPointsChart.tsx
git commit -m "Implement CustomTooltip in RankingPointsChart"
```

---

## Task 6: Smoke test and final polish

**Files:**
- Modify: `frontend/src/components/RankingPointsChart.tsx` (minor polish only if needed)

- [ ] **Start dev server and navigate to `/ranking?view=points`:**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/ranking?view=points` (or whichever port is configured).

- [ ] **Verify the following checklist:**

  - [ ] "Punkty" tab is visible and active when `?view=points` is in the URL
  - [ ] "Wykres pozycji" tab still works and shows the bump chart unchanged
  - [ ] "Tabela" tab still works
  - [ ] Fog chart renders with visible Y-axis in points (not position, not reversed)
  - [ ] "Me" line is bold green and clearly on top of all others
  - [ ] Favourite users (if any starred) render in bold amber
  - [ ] Top 3 lines show `#1`, `#2`, `#3` labels at the rightmost data point
  - [ ] Prize zone dashed amber line is visible (if rewarded_positions > 0)
  - [ ] Hovering a line (via activeDot) shows the tooltip with username, points, and position
  - [ ] Clicking a legend entry highlights that user's line (full opacity, others dimmed to 5%)
  - [ ] Clicking multiple legend entries highlights all of them simultaneously
  - [ ] "Wyczyść (N)" button appears when any user is highlighted; clicking it clears all
  - [ ] On mobile viewport: chart scrolls horizontally, legend is collapsible

- [ ] **Fix any visual issues discovered above, then commit:**

```bash
git add frontend/src/components/RankingPointsChart.tsx
git commit -m "Ranking points fog chart: smoke test fixes"
```

If no fixes needed, skip this commit.
