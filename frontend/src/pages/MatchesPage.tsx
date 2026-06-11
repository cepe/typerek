import { useSearchParams } from 'react-router-dom'
import { useMatches, usePlaceBet } from '@/api/hooks'
import { formatDateLong, groupByDay, relativeDay } from '@/lib/format'
import { BET_TYPES, BET_LEGEND } from '@/lib/bets'
import MatchLine from '@/components/MatchLine'
import { useLocalStarted } from '@/lib/useLocalStarted'
import BetGrid from '@/components/BetGrid'
import LockToggle from '@/components/LockToggle'
import { ErrorBox, Loading } from '@/components/Status'
import type { BetType, Match } from '@/api/types'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function DayBadge({ iso }: { iso: string }) {
  const label = relativeDay(iso)
  if (!label) return null
  const cls = label === 'dziś' ? 'bg-brand/15 text-brand' : 'bg-sky-100 text-sky-600'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`}>{label}</span>
}

function MatchRow({ match }: { match: Match }) {
  const placeBet = usePlaceBet()
  const { betLock } = useSettings()
  const localStarted = useLocalStarted(match)
  const live = localStarted && !match.finished
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5${live ? ' bg-amber-50/70' : ''}`}
    >
      <MatchLine match={match} started={localStarted} />
      {/* Pills, plus a fixed padlock slot on the right when the feature is
          on. The slot is reserved in every row (lock or empty) so the 6
          columns share one offset, matching the legend's trailing spacer. */}
      <div className="flex items-center gap-2">
        <div className="flex-1 sm:w-[340px] sm:flex-none">
          <BetGrid
            match={match}
            myAnswer={match.my_answer}
            pending={placeBet.isPending}
            onBet={(result: BetType) => placeBet.mutate({ matchId: match.id, result })}
          />
        </div>
        {betLock && (
          <div className="w-7 shrink-0">
            <LockToggle match={match} />
          </div>
        )}
      </div>
    </div>
  )
}

function MatchSection({ matches }: { matches: Match[] }) {
  const { betLock } = useSettings()

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak meczów</div>
  }

  return (
    <div className="space-y-4">
      {groupByDay(matches).map((group) => (
        <section key={group.start} className="card overflow-hidden">
          <div className="card-header">
            <h3 className="flex items-center gap-2 text-sm font-bold text-muted">
              {formatDateLong(group.start)}
              <DayBadge iso={group.start} />
            </h3>
            {/* Legend explaining the 1 / X / 2 / 1X / X2 / 12 symbols, aligned over
                the bet pills below (hidden on mobile, where the row stacks). The
                trailing spacer mirrors each row's padlock slot so the columns line up. */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid w-[340px] grid-cols-6 gap-1.5 sm:gap-2">
                {BET_TYPES.map(([result]) => (
                  <div key={result} className="text-center text-[10px] leading-tight text-muted">
                    {BET_LEGEND[result]}
                  </div>
                ))}
              </div>
              {betLock && <div className="w-7 shrink-0" aria-hidden="true" />}
            </div>
          </div>
          <div className="divide-y divide-line/60">
            {group.items.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// Mirrors matches/index.html.erb (tabs Aktualne / Zakończone).
export default function MatchesPage() {
  const { data, isLoading, isError } = useMatches()
  // The active tab lives in the URL (?status=finished) so a refresh or a shared
  // link keeps you on the same tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: 'future' | 'finished' = searchParams.get('status') === 'finished' ? 'finished' : 'future'
  const selectTab = (next: 'future' | 'finished') =>
    setSearchParams(next === 'finished' ? { status: 'finished' } : {}, { replace: true })

  useDocumentTitle('Mecze')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-futbol text-brand" aria-hidden="true" /> Mecze
      </h1>

      <div className="mb-5 flex border-b border-line">
        <button type="button" onClick={() => selectTab('future')} className={`tab${tab === 'future' ? ' tab-active' : ''}`}>
          Aktualne <span className="badge-count">{data.not_finished.length}</span>
        </button>
        <button
          type="button"
          onClick={() => selectTab('finished')}
          className={`tab${tab === 'finished' ? ' tab-active' : ''}`}
        >
          Zakończone <span className="badge-count">{data.finished.length}</span>
        </button>
      </div>

      {tab === 'future' ? (
        <MatchSection matches={data.not_finished} />
      ) : (
        <MatchSection matches={data.finished} />
      )}
    </div>
  )
}
