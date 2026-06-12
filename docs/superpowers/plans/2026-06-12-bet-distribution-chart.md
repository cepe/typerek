# Bet Distribution Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a donut chart inside the "Typy uczestników" card on the match detail page showing how many players chose each bet type.

**Architecture:** A new self-contained `BetDistributionChart` component derives counts from the `participants` array already available in `MatchPage` and renders a recharts donut chart with a legend. `MatchPage` is minimally modified to render the chart between the card header and the participant list.

**Tech Stack:** React, TypeScript, recharts (`PieChart`, `Pie`, `Cell`, `Tooltip`), Tailwind CSS

---

## File Map

| Action | Path |
|--------|------|
| Create | `frontend/src/components/BetDistributionChart.tsx` |
| Modify | `frontend/src/pages/MatchPage.tsx` |

---

### Task 1: Create `BetDistributionChart` component

**Files:**
- Create: `frontend/src/components/BetDistributionChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { BET_TYPES } from '@/lib/bets'
import type { Participant } from '@/api/types'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#e0e7ff']

interface Props {
  participants: Participant[]
}

interface TooltipPayload {
  name: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: TooltipPayload }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { value } = payload[0].payload
  return (
    <div className="card card-body py-1.5 text-xs shadow-lg">
      {value} {value === 1 ? 'gracz' : 'graczy'}
    </div>
  )
}

export default function BetDistributionChart({ participants }: Props) {
  const data = BET_TYPES.map(([result, label], i) => ({
    label,
    count: participants.filter((p) => p.result === result).length,
    color: COLORS[i],
  })).filter((d) => d.count > 0)

  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="flex items-center gap-6 px-4 py-4 sm:px-5">
      <div className="relative shrink-0">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx={60}
            cy={60}
            innerRadius={34}
            outerRadius={56}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-ink">{total}</span>
          <span className="text-[10px] text-muted">graczy</span>
        </div>
      </div>

      <ul className="space-y-1 text-xs">
        {data.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold text-ink">{entry.label}</span>
            <span className="text-muted">— {entry.count} {entry.count === 1 ? 'gracz' : 'graczy'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/qarol/Work/typerek-cepe/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/BetDistributionChart.tsx
git commit -m "feat: add BetDistributionChart donut component"
```

---

### Task 2: Integrate chart into `MatchPage`

**Files:**
- Modify: `frontend/src/pages/MatchPage.tsx`

- [ ] **Step 1: Add import**

At the top of `MatchPage.tsx`, after the existing component imports, add:

```tsx
import BetDistributionChart from '@/components/BetDistributionChart'
```

- [ ] **Step 2: Render chart inside the participants section**

The current participants section in `MatchPage.tsx` looks like:

```tsx
{match.started && match.participants && (
  <section className="card overflow-hidden">
    <div className="card-header">
      <h3 className="flex items-center gap-2">
        <i className="fas fa-users text-brand" aria-hidden="true" /> Typy uczestników
      </h3>
    </div>
    <div className="divide-y divide-line/60">
      {match.participants.map((participant) => (
```

Replace it with:

```tsx
{match.started && match.participants && (
  <section className="card overflow-hidden">
    <div className="card-header">
      <h3 className="flex items-center gap-2">
        <i className="fas fa-users text-brand" aria-hidden="true" /> Typy uczestników
      </h3>
    </div>
    <div className="border-b border-line/60">
      <BetDistributionChart participants={match.participants} />
    </div>
    <div className="divide-y divide-line/60">
      {match.participants.map((participant) => (
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/qarol/Work/typerek-cepe/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run the dev server and visually verify**

Start the dev server and open a match page for a started match. Confirm:
- Donut chart appears between the header and the participant list.
- Center shows total player count.
- Legend lists only bet types with ≥1 vote.
- Hovering a slice shows "N gracz/graczy" tooltip.
- If no participant has a bet, the chart section is hidden (the `border-b` wrapper div will be empty — adjust if needed: wrap in `{match.participants.some(p => p.result) && <div ...>}`).

- [ ] **Step 5: Fix empty-chart border if needed**

If the `border-b` wrapper div is visible even when the chart is hidden (because all bets are null), update the wrapper to be conditional:

```tsx
{match.participants.some((p) => p.result != null) && (
  <div className="border-b border-line/60">
    <BetDistributionChart participants={match.participants} />
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/MatchPage.tsx
git commit -m "feat: show bet distribution chart on match page"
```
