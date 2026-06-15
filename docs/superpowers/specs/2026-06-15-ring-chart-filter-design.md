# Ring Chart Bet Filter — Design Spec

**Date:** 2026-06-15

## Summary

Make the donut (ring) chart segments and legend items in the "Typy uczestników" section clickable to filter the participant list below to only those who bet that result. Clicking the same item again deselects and shows all participants.

## Architecture

State lives in `MatchPage` — it already owns both `BetDistributionChart` and the participants list, so no new component is needed.

- Add `selectedResult: BetType | null` state (initialized to `null`) in `MatchPage`
- Pass two new props to `BetDistributionChart`: `selectedResult` and `onSelect: (result: BetType | null) => void`
- Filter the participants `.map()` using `selectedResult` — when non-null, skip participants whose `result !== selectedResult`

## BetDistributionChart changes

**Interactivity:**
- Each `<Cell>` in the `<Pie>` gets an `onClick` handler: if the clicked result equals `selectedResult`, call `onSelect(null)` (deselect); otherwise call `onSelect(result)`
- Each legend `<li>` gets the same toggle logic and a `cursor-pointer` class

**Visual feedback for selected state:**
- Selected `<Cell>`: rendered with full opacity; unselected cells get `opacity-40` via the `Cell` `style` prop
- Selected legend `<li>`: bold text; unselected items get `opacity-50`
- When nothing is selected (`selectedResult === null`): all items render at full opacity (current behavior)

## Participant list changes

In `MatchPage`, the existing `.map()` over `match.participants` gets a `.filter()` prepended:

```ts
const visibleParticipants = selectedResult === null
  ? match.participants
  : match.participants.filter((p) => p.result === selectedResult)
```

No count label or extra UI — the list simply shrinks.

## Props interface delta

```ts
// BetDistributionChart — new props
selectedResult?: BetType | null
onSelect?: (result: BetType | null) => void
```

Both are optional with safe defaults (no-op / null) so existing usages don't break if any exist beyond MatchPage.

## Out of scope

- URL persistence of the filter
- Multi-select (more than one bet type at a time)
- Animation when list filters
