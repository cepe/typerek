import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useRanking } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import { pointsDisplay } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const BADGES: Record<number, string> = {
  1: 'bg-yellow-400 text-white',
  2: 'bg-gray-300 text-ink',
  3: 'bg-amber-600 text-white',
}

// Mirrors rankings/show.html.erb.
export default function RankingPage() {
  const { data, isLoading, isError } = useRanking()
  const { user } = useAuth()
  const { drzewkoMode } = useSettings()
  const meRowRef = useRef<HTMLLIElement>(null)

  useDocumentTitle('Ranking')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const meEntry = data.find((entry) => entry.user.id === user?.id)
  const scrollToMe = () => meRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-trophy text-brand" aria-hidden="true" /> Ranking{' '}
        <span className="badge-count">{data.length}</span>
      </h1>
      <div className="mx-auto max-w-xl">
        {meEntry && (
          <div className="card card-body mb-4 flex items-center justify-between gap-3 border border-brand bg-brand-tint">
            <span className="leading-tight">
              <i className="fas fa-star text-brand" aria-hidden="true" /> Twoja pozycja:{' '}
              <span className="font-bold text-ink">
                {meEntry.position} / {data.length}
              </span>{' '}
              · <span className="font-bold text-ink tabular-nums">{pointsDisplay(meEntry.points)}</span> pkt
            </span>
            <button type="button" className="btn btn-brand btn-sm shrink-0" onClick={scrollToMe}>
              <i className="fas fa-location-arrow" aria-hidden="true" /> Pokaż mnie
            </button>
          </div>
        )}
        <ul className="card divide-y divide-line/60 overflow-hidden">
          {data.map((entry) => {
            const me = user?.id === entry.user.id
            const badge = BADGES[entry.position] ?? 'bg-surface text-muted'
            return (
              <li
                key={entry.user.id}
                ref={me ? meRowRef : undefined}
                className={`flex items-center gap-3 px-4 py-3 ${
                  me ? (drzewkoMode ? 'drzewko-flash' : 'bg-brand-tint') : ''
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${badge}`}
                >
                  {entry.position}
                </span>
                <span className="flex-1 truncate font-medium">
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
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
