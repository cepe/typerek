import { useState } from 'react'
import { useMatches, usePlaceBet } from '@/api/hooks'
import { formatDateLong, groupByDay } from '@/lib/format'
import MatchLine from '@/components/MatchLine'
import BetGrid from '@/components/BetGrid'
import { ErrorBox, Loading } from '@/components/Status'
import type { BetType, Match } from '@/api/types'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function MatchSection({ matches }: { matches: Match[] }) {
  const placeBet = usePlaceBet()

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak meczów</div>
  }

  return (
    <div className="space-y-4">
      {groupByDay(matches).map((group) => (
        <section key={group.start} className="card overflow-hidden">
          <div className="card-header">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{formatDateLong(group.start)}</h3>
          </div>
          <div className="divide-y divide-line/60">
            {group.items.map((match) => (
              <div
                key={match.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <MatchLine match={match} />
                <div className="sm:w-[340px]">
                  <BetGrid
                    match={match}
                    myAnswer={match.my_answer}
                    pending={placeBet.isPending}
                    onBet={(result: BetType) => placeBet.mutate({ matchId: match.id, result })}
                  />
                </div>
              </div>
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
  const [tab, setTab] = useState<'future' | 'finished'>('future')

  useDocumentTitle('Mecze')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fa fa-futbol-o text-brand" aria-hidden="true" /> Mecze
      </h1>

      <div className="mb-5 flex border-b border-line">
        <button type="button" onClick={() => setTab('future')} className={`tab${tab === 'future' ? ' tab-active' : ''}`}>
          Aktualne <span className="badge-count">{data.not_finished.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('finished')}
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
