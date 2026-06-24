// Which column the ranking table is ordered by. 'points' is the canonical,
// prize-deciding order (mirrors Typerek::Ranking::Query on the backend); 'hits'
// re-ranks by the number of correct bets ("trafienia") as an alternative view.
export type RankSort = 'points' | 'hits'

export function parseRankSort(param: string | null): RankSort {
  return param === 'hits' ? 'hits' : 'points'
}

// The minimal shape rankEntries needs. RankingEntry satisfies it, and so will the
// virtual benchmark players added later — both can be ranked by the same code.
interface Rankable {
  user: { username: string }
  points: number
  accuracy: number
}

// Re-rank entries client-side by the chosen key, mirroring the server's order:
// the key descending, ties broken by username ascending, and shared positions for
// equal key values (1, 1, 3). Ordering by 'hits' falls back to points (then
// username) so equal-accuracy players keep a stable, sensible order, but the
// *position* is shared for the same hit count. For 'points' this reproduces
// Typerek::Ranking::Query exactly, so callers can recompute positions after
// inserting extra rows (e.g. virtual players) without diverging from the backend.
export function rankEntries<T extends Rankable>(entries: T[], sort: RankSort): (T & { position: number })[] {
  const key = (entry: Rankable) => (sort === 'hits' ? entry.accuracy : entry.points)
  const sorted = [...entries].sort((a, b) => {
    const byKey = key(b) - key(a)
    if (byKey !== 0) return byKey
    if (sort === 'hits' && b.points !== a.points) return b.points - a.points
    const an = a.user.username.toLowerCase()
    const bn = b.user.username.toLowerCase()
    return an < bn ? -1 : an > bn ? 1 : 0
  })
  const values = sorted.map(key)
  return sorted.map((entry, index) => ({ ...entry, position: values.indexOf(values[index]) + 1 }))
}
