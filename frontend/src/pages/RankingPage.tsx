import { Fragment, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMatches, useRanking } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import RankingBumpChart from '@/components/RankingBumpChart'
import RankingPointsChart from '@/components/RankingPointsChart'
import SeedStrategyCard from '@/components/SeedStrategyCard'
import RuleStrategyCard from '@/components/RuleStrategyCard'
import { pointsDisplay } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { rankEntries, parseRankSort, type RankSort } from '@/lib/ranking'
import { scoreSeed } from '@/lib/seedStrategy'
import { parseRules, scoreRules } from '@/lib/ruleStrategy'
import type { RankingEntry } from '@/api/types'

// Colour of the round position badge. Gold / silver / bronze for the podium, a
// softer amber for the rest of the prize zone (positions 4..N), plain otherwise.
function positionBadgeClass(position: number, rewarded: number): string {
  // Medals use slightly deeper, less saturated shades in dark mode so they don't
  // glare on the dark page. Silver keeps fixed-dark text (text-ink would flip to
  // near-white in dark mode and vanish on the light-grey chip).
  if (position === 1) return 'bg-yellow-400 text-white dark:bg-yellow-500 dark:text-yellow-950'
  if (position === 2) return 'bg-gray-300 text-gray-900 dark:bg-slate-400 dark:text-slate-950'
  if (position === 3) return 'bg-amber-600 text-white dark:bg-amber-700'
  if (position <= rewarded) {
    return 'bg-highlight text-highlight-fg ring-1 ring-highlight-fg/30'
  }
  return 'bg-surface text-muted'
}

// Polish noun after a count: 1 miejsce, 2–4 miejsca, otherwise miejsc.
function placesLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (n === 1) return 'miejsce'
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'miejsca'
  return 'miejsc'
}

// Movement since the previous match: ▲ green up, ▼ red down, – unchanged, blank
// when there is no prior ranking yet. Fixed-width so the names stay aligned.
function Movement({ entry }: { entry: RankingEntry }) {
  if (entry.previous_position == null) return <span className="w-7 shrink-0" aria-hidden="true" />
  const delta = entry.previous_position - entry.position
  if (delta === 0) {
    return (
      <span className="w-7 shrink-0 text-center text-xs text-muted/50" title="Bez zmian">
        –
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`flex w-7 shrink-0 items-center justify-center gap-0.5 text-xs font-semibold tabular-nums ${
        up ? 'text-emerald-600' : 'text-red-500'
      }`}
      title={up ? `Awans o ${delta}` : `Spadek o ${-delta}`}
    >
      <i className={`fas fa-caret-${up ? 'up' : 'down'}`} aria-hidden="true" />
      {Math.abs(delta)}
    </span>
  )
}

// Fold a string for accent-insensitive search: lowercase, drop combining marks
// (ą→a, ć→c, …) and special-case ł, which has no NFD decomposition. Lets
// "lukasz" match "Łukasz" and "wegrzyn" match "Węgrzyn".
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
}

// A ranking table row: a real entry, a virtual benchmark player (virtualKey set,
// with a negative sentinel user id and no account to link to), or one of the
// experimental strategies — the seed (seed flag) or the rules (rule flag), both
// rendered with a label and badge instead of a profile link.
type RankRow = RankingEntry & { virtualKey?: string; seed?: boolean; rule?: boolean }

// Sentinel user ids for the strategy rows, distinct from the benchmark players'
// -(index + 1) ids (and from each other) so React keys never collide.
const SEED_ROW_ID = -1000
const RULE_ROW_ID = -1001

type View = 'table' | 'chart' | 'points'

function parseView(param: string | null): View {
  if (param === 'chart') return 'chart'
  if (param === 'points') return 'points'
  return 'table'
}

// Mirrors rankings/show.html.erb.
export default function RankingPage() {
  const { data, isLoading, isError } = useRanking()
  const { user } = useAuth()
  const { drzewkoMode, favoriteUserIds, toggleFavorite, virtualPlayers, setVirtualPlayers, seedStrategy, ruleStrategy } =
    useSettings()
  const meRowRef = useRef<HTMLLIElement>(null)
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  // The seed strategy rides the virtual-players toggle; its word lives here (not in
  // the card) so it can also be scored into a ranking row. Scored off the cached
  // finished matches, like the benchmark strategies.
  const [seed, setSeed] = useState('')
  const { data: matchData } = useMatches()
  const trimmedSeed = seed.trim()
  const seedScore = useMemo(() => {
    const finishedMatches = matchData?.finished ?? []
    return trimmedSeed === '' || finishedMatches.length === 0 ? null : scoreSeed(trimmedSeed, finishedMatches)
  }, [trimmedSeed, matchData])
  // The rule strategy rides the same overlay as the seed; its program lives here so
  // it can also be scored into a ranking row. Only a parseable program scores.
  const [rules, setRules] = useState('')
  const ruleScore = useMemo(() => {
    const finishedMatches = matchData?.finished ?? []
    const parsed = parseRules(rules)
    return !parsed.ok || finishedMatches.length === 0 ? null : scoreRules(parsed.rules, finishedMatches)
  }, [rules, matchData])

  // The active subpage and the table sort both live in the URL (?view=chart&sort=hits)
  // so a refresh or shared link keeps the same tab and ordering — same pattern as
  // MatchesPage (?status=finished). The defaults (table / points) are left off the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseView(searchParams.get('view'))
  const sort = parseRankSort(searchParams.get('sort'))
  const updateParams = (next: { view?: View; sort?: RankSort }) => {
    const nextView = next.view ?? view
    const nextSort = next.sort ?? sort
    const params: Record<string, string> = {}
    if (nextView !== 'table') params.view = nextView
    if (nextSort !== 'points') params.sort = nextSort
    setSearchParams(params, { replace: true })
  }
  const selectView = (next: View) => updateParams({ view: next })
  const selectSort = (next: RankSort) => updateParams({ sort: next })

  useDocumentTitle('Ranking')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const entries = data.entries
  const perfectScore = data.perfect_score
  // Each player's points as a share of the season's ceiling (see Match.perfect_score),
  // shown in parentheses next to their points. null while nothing has finished yet,
  // so we never divide by zero or show a meaningless 0%.
  const perfectShare = (points: number): string | null =>
    perfectScore > 0 ? `${Math.round((points / perfectScore) * 100)}%` : null

  const showVirtual = virtualPlayers && data.virtual_players.length > 0

  // Only the 'hits' ordering is "augmented" — a display-only view that drops the
  // points-only chrome (movement arrows and the prize zone, the latter via rewarded
  // being forced to 0 below). Virtual players do NOT make it augmented: they carry
  // no position of their own, so the real field's numbering — and the points
  // ranking it drives, prize zone included — is identical whether they are on or off.
  const augmented = sort === 'hits'
  const sortValue = (row: { points: number; accuracy: number }) =>
    sort === 'hits' ? row.accuracy : row.points

  // Real players keep their canonical numbering: the server's points order, or a
  // hits re-rank among themselves. Virtual players never renumber them.
  const realRanked: RankRow[] = sort === 'hits' ? rankEntries(entries, sort) : entries

  // The benchmark "players" carry no rank of their own — they are slotted into the
  // list purely by score (position 0, never rendered as a number). They have no
  // account, hence a negative sentinel id and a virtualKey to drive their distinct,
  // account-less rendering.
  const virtualRows: RankRow[] = data.virtual_players.map((vp, index) => ({
    position: 0,
    previous_position: null,
    user: { id: -(index + 1), username: vp.username },
    points: vp.points,
    accuracy: vp.accuracy,
    virtualKey: vp.key,
  }))

  // The seed strategy joins the same overlay when a seed is set — but only when the
  // (opt-in, off by default) seed_strategy setting is on. An account-less row
  // (virtualKey marks it as one for all the rank-less handling) slotted by its
  // score, but flagged `seed` so it renders with the seed word, not a profile link.
  const seedRow: RankRow | null =
    seedStrategy && seedScore
      ? {
        position: 0,
        previous_position: null,
        user: { id: SEED_ROW_ID, username: trimmedSeed },
        points: seedScore.points,
        accuracy: seedScore.accuracy,
        virtualKey: 'seed',
        seed: true,
      }
    : null

  // The rule strategy joins the same overlay when its program parses and scores, but
  // only when the (opt-in) rule_strategy setting is on. Like the seed row, an
  // account-less row flagged `rule` so it renders with a label, not a profile link.
  const ruleRow: RankRow | null =
    ruleStrategy && ruleScore
      ? {
        position: 0,
        previous_position: null,
        user: { id: RULE_ROW_ID, username: 'Reguły' },
        points: ruleScore.points,
        accuracy: ruleScore.accuracy,
        virtualKey: 'rule',
        rule: true,
      }
    : null
  const overlayRows = [...virtualRows, ...(seedRow ? [seedRow] : []), ...(ruleRow ? [ruleRow] : [])]

  // Merge by score; a stable sort keeps a real player ahead of a virtual one they
  // tie with and preserves the real field's own order.
  const ranked: RankRow[] = showVirtual
    ? [...realRanked, ...overlayRows].sort((a, b) => sortValue(b) - sortValue(a))
    : realRanked

  const meEntry = ranked.find((entry) => entry.user.id === user?.id)
  const scrollToMe = () => meRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const favorites = new Set(favoriteUserIds)
  const hasFavorites = favorites.size > 0

  // Quick find (by username, accent-insensitive — see fold) plus an optional
  // "favourites only" filter, so you can pull your starred players together
  // without scrolling. Favourites-only keeps your own row visible too, so you can
  // see where you stand among them. Either filter narrows the table, so both drop
  // the prize-zone divider and the cutoff hints, which only make sense against the
  // full, contiguous ranking.
  const folded = fold(query.trim())
  const filtering = folded !== '' || favoritesOnly
  const visible = ranked.filter(
    (entry) =>
      // Favourites-only keeps your own row and the virtual benchmarks (they are an
      // opt-in overlay, not players you'd filter away), plus your starred users.
      (!favoritesOnly ||
        favorites.has(entry.user.id) ||
        entry.user.id === user?.id ||
        entry.virtualKey != null) &&
      (folded === '' || fold(entry.user.username).includes(folded)),
  )

  // Prize zone: the top N places are "in the money" (N decided per season, see
  // CurrentUser#rewarded_positions). Entries are sorted by position asc, so the
  // zone is the contiguous prefix `position <= rewarded` — which also covers ties
  // straddling the cutoff. cutoffPoints is the weakest score still in the zone;
  // firstOutPoints is the best score just outside it.
  // The prize zone is a points-only concept, so the (hits) augmented ordering
  // disables it wholesale by forcing rewarded to 0 (cascades through prizeCount, the
  // hints and the badge colours). It always reads from `entries`, the canonical
  // points order — so virtual players, which never touch that, leave it intact.
  const rewarded = augmented ? 0 : user?.rewarded_positions ?? 0
  const prizeCount = rewarded > 0 ? entries.filter((entry) => entry.position <= rewarded).length : 0
  const cutoffPoints = prizeCount > 0 ? entries[prizeCount - 1].points : null
  const firstOutPoints = prizeCount < entries.length ? entries[prizeCount]?.points ?? null : null

  const meInPrize = !!meEntry && rewarded > 0 && meEntry.position <= rewarded
  const meGap = meEntry && !meInPrize && cutoffPoints != null ? pointsDisplay(cutoffPoints - meEntry.points) : null

  // Where the prize-zone divider sits in the visible list: right after the last real
  // player still in the zone. Virtual rows carry no rank, so they are skipped — a
  // benchmark slotted into the zone by score simply renders above the divider. -1
  // when filtering or there is no zone (no divider then, same as before).
  const prizeDividerIndex =
    filtering || prizeCount === 0
      ? -1
      : visible.reduce(
          (last, row, index) => (row.virtualKey == null && row.position <= rewarded ? index : last),
          -1,
        )

  // A small contextual note on rows near the cutoff: the cushion for the weakest
  // place still in the zone, or the points the nearest chasers need to break in.
  // Only the closest few outside the zone get a note, so the tail stays quiet.
  const zoneHint = (entry: RankingEntry, idx: number): { text: string; tone: string } | null => {
    if (rewarded === 0 || cutoffPoints == null) return null
    if (entry.position <= rewarded) {
      if (firstOutPoints != null && entry.points === cutoffPoints) {
        return { text: `bufor ${pointsDisplay(entry.points - firstOutPoints)} pkt`, tone: 'text-emerald-600 dark:text-emerald-400' }
      }
      return null
    }
    if (idx > prizeCount + 4) return null
    return { text: `+${pointsDisplay(cutoffPoints - entry.points)} do strefy`, tone: 'text-amber-600 dark:text-amber-400' }
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-trophy text-brand" aria-hidden="true" /> Ranking
      </h1>

      <div className="mb-5 flex border-b border-line">
        <button
          type="button"
          onClick={() => selectView('table')}
          className={`tab${view === 'table' ? ' tab-active' : ''}`}
        >
          Tabela
        </button>
        <button
          type="button"
          onClick={() => selectView('chart')}
          className={`tab${view === 'chart' ? ' tab-active' : ''}`}
        >
          Historia pozycji
        </button>
        <button
          type="button"
          onClick={() => selectView('points')}
          className={`tab${view === 'points' ? ' tab-active' : ''}`}
        >
          Historia punktów
        </button>
      </div>

      {view === 'table' ? (
        <div className="mx-auto max-w-xl">
          {meEntry && (
            <div className="card card-body mb-4 flex items-center justify-between gap-3 border border-brand bg-brand-tint">
              <span className="leading-tight">
                <i className="fas fa-star text-brand" aria-hidden="true" /> Twoja pozycja:{' '}
                <span className="font-bold text-ink">
                  {meEntry.position} / {entries.length}
                </span>{' '}
                · <span className="font-bold text-ink tabular-nums">{pointsDisplay(meEntry.points)}</span> pkt
                {perfectShare(meEntry.points) && (
                  <span className="text-muted">
                    {' '}
                    ({perfectShare(meEntry.points)} z {pointsDisplay(perfectScore)} pkt)
                  </span>
                )}
                {rewarded > 0 && (meInPrize || meGap != null) && (
                  <span className="mt-0.5 block text-xs font-medium">
                    {meInPrize ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        <i className="fas fa-trophy" aria-hidden="true" /> W strefie nagród
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">+{meGap} pkt do strefy nagród</span>
                    )}
                  </span>
                )}
              </span>
              <button type="button" className="btn btn-brand btn-sm shrink-0" onClick={scrollToMe}>
                <i className="fas fa-location-arrow" aria-hidden="true" /> Pokaż mnie
              </button>
            </div>
          )}
          {/* Filters grouped in one box so they read as a set of view options
              rather than loose controls blending into the page. */}
          <div className="card card-body mb-4 space-y-3">
            <div className="relative">
              <i
                className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Szukaj zawodnika…"
                aria-label="Szukaj zawodnika"
                autoCapitalize="none"
                autoCorrect="off"
                className="field pl-9 pr-9"
              />
              {query !== '' && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Wyczyść wyszukiwanie"
                  title="Wyczyść"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
                >
                  <i className="fas fa-xmark" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2">
                <span className="text-sm font-medium text-muted">Sortuj:</span>
                <div className="inline-flex rounded-full bg-surface p-0.5">
                  {(
                    [
                      ['points', 'Punkty'],
                      ['hits', 'Trafienia'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectSort(value)}
                      aria-pressed={sort === value}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        sort === value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(hasFavorites || favoritesOnly) && (
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((value) => !value)}
                  aria-pressed={favoritesOnly}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    favoritesOnly
                      ? 'border-amber-400 bg-amber-100/80 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'border-line text-muted hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <i className={`${favoritesOnly ? 'fas text-yellow-400' : 'far'} fa-star`} aria-hidden="true" />
                  Tylko ulubieni
                </button>
              )}
              <button
                type="button"
                onClick={() => void setVirtualPlayers(!virtualPlayers)}
                aria-pressed={virtualPlayers}
                title="Pokaż w rankingu strategie-benchmarki: Faworyt, Underdog, Drugi kurs, Remis"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  virtualPlayers
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-line text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <i className="fas fa-robot" aria-hidden="true" />
                Wirtualni gracze
              </button>
            </div>
          </div>
          {virtualPlayers && seedStrategy && <SeedStrategyCard seed={seed} onSeedChange={setSeed} />}
          {virtualPlayers && ruleStrategy && <RuleStrategyCard rules={rules} onRulesChange={setRules} />}
          {visible.length === 0 ? (
            <div className="card card-body text-center text-muted">
              {query.trim()
                ? `Brak zawodników pasujących do „${query.trim()}”.`
                : 'Nie masz jeszcze ulubionych zawodników do pokazania.'}
            </div>
          ) : (
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {visible.map((entry, idx) => {
              const me = user?.id === entry.user.id
              const virtual = entry.virtualKey != null
              const inPrize = !virtual && rewarded > 0 && entry.position <= rewarded
              const fav = !me && !virtual && favorites.has(entry.user.id)
              const hint = filtering || virtual ? null : zoneHint(entry, idx)
              // Favourites and prize-zone rows both get a left accent; a favourite
              // takes precedence on the background tint (a touch deeper amber than
              // the zone) so a starred row stands out even when it's also in the zone.
              const accent =
                inPrize || fav ? 'border-l-[3px] border-amber-400' : 'border-l-[3px] border-transparent'
              const bg = me
                ? drzewkoMode
                  ? 'drzewko-flash'
                  : 'bg-brand-tint'
                : fav
                  ? 'bg-amber-100/80 dark:bg-amber-500/10'
                  : inPrize
                    ? 'bg-highlight/60'
                    : virtual
                      ? 'bg-surface/50'
                      : ''
              return (
                <Fragment key={entry.user.id}>
                  <li
                    ref={me ? meRowRef : undefined}
                    className={`flex items-center gap-2.5 px-4 py-3 ${accent} ${bg}`}
                  >
                    {/* Virtual players hold no rank — a muted bot chip stands in for
                        the position number so the real numbering is never disturbed. */}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                        virtual ? 'bg-surface text-muted/60' : positionBadgeClass(entry.position, rewarded)
                      }`}
                    >
                      {virtual ? (
                        <i
                          className={`fas ${entry.seed ? 'fa-dice' : entry.rule ? 'fa-code' : 'fa-robot'} text-xs`}
                          aria-hidden="true"
                        />
                      ) : (
                        entry.position
                      )}
                    </span>
                    {augmented ? null : <Movement entry={entry} />}
                    <span className={`flex-1 truncate ${fav ? 'font-semibold' : 'font-medium'}`}>
                      {entry.seed || entry.rule ? (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className="italic">{entry.user.username}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {entry.seed ? 'seed' : 'reguły'}
                          </span>
                        </span>
                      ) : virtual ? (
                        <Link
                          to={`/ranking/virtual/${entry.virtualKey}`}
                          className="inline-flex items-center gap-1.5 text-muted hover:text-brand"
                        >
                          <span className="italic">{entry.user.username}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            wirtualny
                          </span>
                        </Link>
                      ) : (
                        <Link to={`/users/${entry.user.id}`} className="text-ink hover:text-brand">
                          {entry.user.username}
                        </Link>
                      )}
                      {me && <span className="ml-1 text-xs font-normal text-brand">(Ty)</span>}
                    </span>
                    <span className="text-right leading-tight">
                      <span className="font-bold text-ink tabular-nums">
                        {pointsDisplay(entry.points)} <span className="text-xs font-normal text-muted">pkt</span>
                        {perfectShare(entry.points) && (
                          <span className="ml-1 text-xs font-normal text-muted tabular-nums">
                            ({perfectShare(entry.points)})
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted">{entry.accuracy} trafień</span>
                      {hint && <span className={`block text-xs font-medium ${hint.tone}`}>{hint.text}</span>}
                    </span>
                    {me || virtual ? (
                      <span className="w-8 shrink-0" aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(entry.user.id)}
                        aria-pressed={fav}
                        aria-label={
                          fav
                            ? `Usuń ${entry.user.username} z ulubionych`
                            : `Dodaj ${entry.user.username} do ulubionych`
                        }
                        title={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                          fav ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted/40 hover:text-yellow-400'
                        }`}
                      >
                        <i className={`${fav ? 'fas' : 'far'} fa-star`} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                  {idx === prizeDividerIndex && idx < visible.length - 1 && (
                    <li className="flex items-center gap-2 bg-highlight px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-highlight-fg">
                      <i className="fas fa-trophy" aria-hidden="true" />
                      Strefa nagród · {rewarded} {placesLabel(rewarded)}
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ul>
          )}
        </div>
      ) : view === 'chart' ? (
        <RankingBumpChart enabled={view === 'chart'} />
      ) : view === 'points' ? (
        <RankingPointsChart enabled />
      ) : null}
    </>
  )
}
