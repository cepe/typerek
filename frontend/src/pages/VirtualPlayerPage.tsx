import { Link, useParams } from 'react-router-dom'
import { useVirtualPlayer } from '@/api/hooks'
import { ErrorBox, Loading } from '@/components/Status'
import MatchLine from '@/components/MatchLine'
import BetGrid from '@/components/BetGrid'
import { formatDateLong, groupByDay, pointsDisplay } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// How each strategy picks, shown under its name so the profile explains itself.
const STRATEGY_HINT: Record<string, string> = {
  favourite: 'Zawsze typuje faworyta — niższy z kursów 1 / 2 (najbardziej prawdopodobny wynik).',
  underdog: 'Zawsze typuje niżej notowanego — wyższy z kursów 1 / 2.',
  second_odds: 'Zawsze typuje wynik z drugim najwyższym kursem spośród 1 / X / 2 (drugi najwyżej punktowany typ).',
  draw: 'Zawsze typuje remis.',
}

// A virtual benchmark strategy's "profile": its picks on started matches, so its
// hits and misses read off exactly like a real participant's (UserProfilePage).
export default function VirtualPlayerPage() {
  const { key = '' } = useParams()
  const { data, isLoading, isError } = useVirtualPlayer(key)

  useDocumentTitle(data ? `Strategia: ${data.player.username}` : undefined)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  return (
    <>
      <Link to="/ranking" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <i className="fas fa-angle-left" aria-hidden="true" /> Ranking
      </Link>

      <div className="mb-5">
        <h1 className="flex items-center gap-2">
          <i className="fas fa-robot text-brand" aria-hidden="true" /> {data.player.username}
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            wirtualny
          </span>
        </h1>
        {STRATEGY_HINT[data.player.key] && (
          <p className="mt-1 text-muted">{STRATEGY_HINT[data.player.key]}</p>
        )}
        <p className="mt-1 text-muted">
          Liczba trafień: <span className="font-semibold text-ink">{data.player.accuracy}</span> ·{' '}
          <span className="font-semibold text-ink tabular-nums">{pointsDisplay(data.player.points)}</span> pkt
        </p>
      </div>

      {data.started_matches.length === 0 ? (
        <div className="card card-body text-center text-muted">Brak rozegranych meczów</div>
      ) : (
        <div className="space-y-4">
          {groupByDay(data.started_matches).map((group) => (
            <section key={group.start} className="card overflow-hidden">
              <div className="card-header">
                <h3 className="text-sm font-bold text-muted">{formatDateLong(group.start)}</h3>
              </div>
              <div className="divide-y divide-line/60">
                {group.items.map((match) => (
                  <div
                    key={match.id}
                    className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5${
                      match.started && !match.finished ? ' bg-highlight/70' : ''
                    }`}
                  >
                    <MatchLine match={match} />
                    <div className="sm:w-[340px]">
                      <BetGrid match={match} myAnswer={match.answer} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
