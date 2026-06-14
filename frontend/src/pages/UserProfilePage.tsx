import { useParams } from 'react-router-dom'
import { useUserProfile } from '@/api/hooks'
import { ErrorBox, Loading } from '@/components/Status'
import MatchLine from '@/components/MatchLine'
import BetGrid from '@/components/BetGrid'
import UserPositionChart from '@/components/UserPositionChart'
import { formatDateLong, groupByDay } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Mirrors users/show.html.erb — a participant's bets on matches that have started.
export default function UserProfilePage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError } = useUserProfile(id)

  useDocumentTitle(data ? `Typy: ${data.user.username}` : undefined)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  return (
    <>
      <div className="mb-5">
        <h1 className="flex items-center gap-2">
          <i className="fas fa-user text-brand" aria-hidden="true" /> Typy użytkownika {data.user.username}
        </h1>
        <p className="mt-1 text-muted">
          Liczba trafień: <span className="font-semibold text-ink">{data.user.accuracy}</span>
        </p>
      </div>

      <div className="mb-5">
        <UserPositionChart userId={data.user.id} />
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
