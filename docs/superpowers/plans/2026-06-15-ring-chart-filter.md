# Ring Chart Bet Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make donut chart segments and legend items in "Typy uczestników" clickable to filter the participant list to only those who bet that result; clicking again deselects.

**Architecture:** `selectedResult: BetType | null` state lives in `MatchPage` (owner of both chart and list). `BetDistributionChart` receives `selectedResult` + `onSelect` props and handles visual feedback internally. The participant list filters via a derived `visibleParticipants` array.

**Tech Stack:** React 18, TypeScript, Recharts (PieChart/Pie/Cell), Tailwind CSS, Vitest

---

## File Map

- Modify: `frontend/src/components/BetDistributionChart.tsx` — add `selectedResult`/`onSelect` props, make cells and legend items clickable, apply opacity feedback
- Modify: `frontend/src/pages/MatchPage.tsx` — add `selectedResult` state, derive `visibleParticipants`, pass new props to chart

---

### Task 1: Extend BetDistributionChart with filter props and interactivity

**Files:**
- Modify: `frontend/src/components/BetDistributionChart.tsx`

- [ ] **Step 1: Add new props to the interface**

Open `frontend/src/components/BetDistributionChart.tsx`. Change the `Props` interface from:

```ts
interface Props {
  participants: Participant[]
  finished: boolean
  scoredBets: Set<BetType> | null
}
```

to:

```ts
interface Props {
  participants: Participant[]
  finished: boolean
  scoredBets: Set<BetType> | null
  selectedResult?: BetType | null
  onSelect?: (result: BetType | null) => void
}
```

- [ ] **Step 2: Destructure the new props in the function signature**

Change the function signature from:

```ts
export default function BetDistributionChart({ participants, finished, scoredBets }: Props) {
```

to:

```ts
export default function BetDistributionChart({ participants, finished, scoredBets, selectedResult = null, onSelect }: Props) {
```

- [ ] **Step 3: Add a toggle handler inside the component**

Add this just before the `return` statement (after the `data` derivation):

```ts
  function handleToggle(result: BetType) {
    onSelect?.(selectedResult === result ? null : result)
  }
```

- [ ] **Step 4: Make Pie cells clickable and apply opacity feedback**

The `<Pie>` currently renders `<Cell key={entry.label} fill={entry.color} />`. Replace the entire `<Pie>` block (lines 62–74 in the original) with:

```tsx
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
  style={{ cursor: onSelect ? 'pointer' : 'default' }}
>
  {data.map((entry) => (
    <Cell
      key={entry.label}
      fill={entry.color}
      style={{
        opacity: selectedResult === null || selectedResult === entry.result ? 1 : 0.3,
        transition: 'opacity 0.15s',
      }}
      onClick={() => handleToggle(entry.result)}
    />
  ))}
</Pie>
```

- [ ] **Step 5: Make legend items clickable with visual feedback**

Replace the `<ul>` legend (lines 85–97 in the original) with:

```tsx
<ul className="space-y-1 text-xs">
  {data.map((entry) => {
    const isSelected = selectedResult === entry.result
    const isDimmed = selectedResult !== null && !isSelected
    return (
      <li
        key={entry.label}
        className={`flex items-center gap-2 transition-opacity ${onSelect ? 'cursor-pointer' : ''} ${isDimmed ? 'opacity-30' : ''}`}
        onClick={() => handleToggle(entry.result)}
      >
        <span
          className="inline-block h-2.5 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: entry.color }}
        />
        <span className={`text-ink ${isSelected ? 'font-bold' : 'font-semibold'}`}>{entry.label}</span>
        <span className="text-muted">— {entry.count} {pluralGraczy(entry.count)}</span>
      </li>
    )
  })}
</ul>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BetDistributionChart.tsx
git commit -m "feat: add selectedResult/onSelect props to BetDistributionChart"
```

---

### Task 2: Wire filter state in MatchPage

**Files:**
- Modify: `frontend/src/pages/MatchPage.tsx`

- [ ] **Step 1: Add selectedResult state**

After the existing `const favorites = new Set(favoriteUserIds)` line, add:

```ts
const [selectedResult, setSelectedResult] = React.useState<BetType | null>(null)
```

And add the React import at the top if not already present. The file currently starts with:
```ts
import { Link, useParams } from 'react-router-dom'
```

Add React:
```ts
import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
```

Then replace the `useState` call above with:
```ts
const [selectedResult, setSelectedResult] = useState<BetType | null>(null)
```

Also import `BetType` — it's already available via `@/api/types` but check the existing import on line 9:
```ts
import { BET_TYPES, betPillClass, winningBets } from '@/lib/bets'
```
`BetType` comes from `@/api/types`. Check if it's already imported:
```ts
// line 10 (check actual file) — if not present, add BetType to the existing types import:
import type { BetType } from '@/api/types'
```
(There is no existing `@/api/types` import in MatchPage currently, so add this line.)

- [ ] **Step 2: Derive visibleParticipants**

Just before the `return` statement, add:

```ts
const visibleParticipants = selectedResult === null
  ? match.participants
  : match.participants.filter((p) => p.result === selectedResult)
```

- [ ] **Step 3: Pass new props to BetDistributionChart**

Find the existing `<BetDistributionChart ... />` usage (line 98):

```tsx
<BetDistributionChart participants={match.participants} finished={match.finished} scoredBets={scored} />
```

Replace with:

```tsx
<BetDistributionChart
  participants={match.participants}
  finished={match.finished}
  scoredBets={scored}
  selectedResult={selectedResult}
  onSelect={setSelectedResult}
/>
```

- [ ] **Step 4: Use visibleParticipants in the list**

Find the participant list `.map()` (line 102):

```tsx
{match.participants.map((participant) => {
```

Replace with:

```tsx
{visibleParticipants.map((participant) => {
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MatchPage.tsx
git commit -m "feat: filter participants by clicking ring chart segment"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/qarol/Work/typerek-cepe/frontend && npm run dev
```

- [ ] **Step 2: Open a match page that has started (participants visible)**

Navigate to a match with participants showing the "Typy uczestników" section.

- [ ] **Step 3: Verify filter interaction**

- Click a ring chart segment → only participants who bet that result appear in the list
- Click a legend item → same filtering
- Click the same segment/legend item again → all participants reappear
- When a filter is active: unselected segments/legend items are dimmed (opacity ~30%), selected item has bold label
- When no filter: all segments and legend items are at full opacity

- [ ] **Step 4: Run TypeScript check**

```bash
cd /Users/qarol/Work/typerek-cepe/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd /Users/qarol/Work/typerek-cepe/frontend && npm test
```

Expected: all tests pass (existing webmcp tests unaffected).
