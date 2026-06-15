import { Fragment, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRanking } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import RankingBumpChart from '@/components/RankingBumpChart'
import RankingPointsChart from '@/components/RankingPointsChart'
import { pointsDisplay } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
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
  const { drzewkoMode, favoriteUserIds, toggleFavorite } = useSettings()
  const meRowRef = useRef<HTMLLIElement>(null)

  // The active subpage lives in the URL (?view=chart) so a refresh or shared link
  // keeps you on the same tab — same pattern as MatchesPage (?status=finished).
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseView(searchParams.get('view'))
  const selectView = (next: View) =>
    setSearchParams(next === 'table' ? {} : { view: next }, { replace: true })

  useDocumentTitle('Ranking')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const meEntry = data.find((entry) => entry.user.id === user?.id)
  const scrollToMe = () => meRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const favorites = new Set(favoriteUserIds)

  // Prize zone: the top N places are "in the money" (N decided per season, see
  // CurrentUser#rewarded_positions). Entries are sorted by position asc, so the
  // zone is the contiguous prefix `position <= rewarded` — which also covers ties
  // straddling the cutoff. cutoffPoints is the weakest score still in the zone;
  // firstOutPoints is the best score just outside it.
  const rewarded = user?.rewarded_positions ?? 0
  const prizeCount = rewarded > 0 ? data.filter((entry) => entry.position <= rewarded).length : 0
  const cutoffPoints = prizeCount > 0 ? data[prizeCount - 1].points : null
  const firstOutPoints = prizeCount < data.length ? data[prizeCount]?.points ?? null : null

  const meInPrize = !!meEntry && rewarded > 0 && meEntry.position <= rewarded
  const meGap = meEntry && !meInPrize && cutoffPoints != null ? pointsDisplay(cutoffPoints - meEntry.points) : null

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
        <i className="fas fa-trophy text-brand" aria-hidden="true" /> Ranking{' '}
        <span className="badge-count">{data.length}</span>
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
          Wykres pozycji
        </button>
        <button
          type="button"
          onClick={() => selectView('points')}
          className={`tab${view === 'points' ? ' tab-active' : ''}`}
        >
          Punkty
        </button>
      </div>

      {view === 'table' ? (
        <div className="mx-auto max-w-xl">
          {meEntry && (
            <div className="card card-body mb-4 flex items-center justify-between gap-3 border border-brand bg-brand-tint">
              <span className="leading-tight">
                <i className="fas fa-star text-brand" aria-hidden="true" /> Twoja pozycja:{' '}
                <span className="font-bold text-ink">
                  {meEntry.position} / {data.length}
                </span>{' '}
                · <span className="font-bold text-ink tabular-nums">{pointsDisplay(meEntry.points)}</span> pkt
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
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {data.map((entry, idx) => {
              const me = user?.id === entry.user.id
              const inPrize = rewarded > 0 && entry.position <= rewarded
              const fav = !me && favorites.has(entry.user.id)
              const hint = zoneHint(entry, idx)
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
                    : ''
              return (
                <Fragment key={entry.user.id}>
                  <li
                    ref={me ? meRowRef : undefined}
                    className={`flex items-center gap-2.5 px-4 py-3 ${accent} ${bg}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${positionBadgeClass(
                        entry.position,
                        rewarded,
                      )}`}
                    >
                      {entry.position}
                    </span>
                    <Movement entry={entry} />
                    <span className={`flex-1 truncate ${fav ? 'font-semibold' : 'font-medium'}`}>
                      <Link to={`/users/${entry.user.id}`} className="text-ink hover:text-brand">
                        {entry.user.username}
                      </Link>
                      {me && <span className="ml-1 text-xs font-normal text-brand">(Ty)</span>}
                    </span>
                    <span className="text-right leading-tight">
                      <span className="font-bold text-ink tabular-nums">
                        {pointsDisplay(entry.points)} <span className="text-xs font-normal text-muted">pkt</span>
                      </span>
                      <span className="block text-xs text-muted">{entry.accuracy} trafień</span>
                      {hint && <span className={`block text-xs font-medium ${hint.tone}`}>{hint.text}</span>}
                    </span>
                    {me ? (
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
                  {prizeCount > 0 && idx === prizeCount - 1 && idx < data.length - 1 && (
                    <li className="flex items-center gap-2 bg-highlight px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-highlight-fg">
                      <i className="fas fa-trophy" aria-hidden="true" />
                      Strefa nagród · {rewarded} {placesLabel(rewarded)}
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ul>
        </div>
      ) : view === 'chart' ? (
        <RankingBumpChart enabled={view === 'chart'} />
      ) : view === 'points' ? (
        <RankingPointsChart enabled />
      ) : null}
    </>
  )
}
