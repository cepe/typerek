import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMatch, useUpdateMatch } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { apiErrorMessage } from '@/api/client'
import { ErrorBox, Loading } from '@/components/Status'
import Alert from '@/components/Alert'
import { BET_TYPES } from '@/lib/bets'
import { toDateTimeLocalValue } from '@/lib/format'
import type { BetType, MatchDetail } from '@/api/types'

const oddsString = (value: number | null) => (value == null ? '' : String(value))

// Mirrors matches/edit.html.erb + matches/_form.html.erb. Team names are always
// editable; odds + start lock once the match has started; the result locks until
// it has started.
function EditForm({ match }: { match: MatchDetail }) {
  const navigate = useNavigate()
  const update = useUpdateMatch(match.id)
  const [error, setError] = useState<string | null>(null)

  const [teamA, setTeamA] = useState(match.team_a)
  const [teamB, setTeamB] = useState(match.team_b)
  const [start, setStart] = useState(toDateTimeLocalValue(match.start))
  const [odds, setOdds] = useState<Record<BetType, string>>({
    win_a: oddsString(match.odds.win_a),
    tie: oddsString(match.odds.tie),
    win_b: oddsString(match.odds.win_b),
    win_tie_a: oddsString(match.odds.win_tie_a),
    win_tie_b: oddsString(match.odds.win_tie_b),
    not_tie: oddsString(match.odds.not_tie),
  })
  const [resultA, setResultA] = useState(match.result_a?.toString() ?? '')
  const [resultB, setResultB] = useState(match.result_b?.toString() ?? '')

  const oddsLocked = match.started
  const resultLocked = !match.started

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    // Only send the fields the corresponding section allows editing, mirroring the
    // Rails form where disabled inputs are not submitted.
    const attributes: Record<string, unknown> = { team_a: teamA, team_b: teamB }
    if (!oddsLocked) {
      for (const [key] of BET_TYPES) {
        if (odds[key] !== '') attributes[key] = Number(odds[key])
      }
      attributes.start = new Date(start).toISOString()
    }
    if (!resultLocked) {
      attributes.result_a = resultA === '' ? null : Number(resultA)
      attributes.result_b = resultB === '' ? null : Number(resultB)
    }

    try {
      await update.mutateAsync(attributes)
      navigate('/matches')
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <Alert kind="alert" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="team_a">Drużyna 1</label>
            <input id="team_a" className="field" autoCapitalize="none" value={teamA} onChange={(e) => setTeamA(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="team_b">Drużyna 2</label>
            <input id="team_b" className="field" autoCapitalize="none" value={teamB} onChange={(e) => setTeamB(e.target.value)} />
          </div>
        </div>

        <div>
          <span className="label">Kursy</span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {BET_TYPES.map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-center text-xs font-bold text-muted" htmlFor={`odds-${key}`}>
                  {label}
                </label>
                <input
                  id={`odds-${key}`}
                  type="number"
                  step="0.01"
                  min="0"
                  className="field text-center"
                  disabled={oddsLocked}
                  value={odds[key]}
                  onChange={(e) => setOdds((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="start">Data rozpoczęcia</label>
          <input
            id="start"
            type="datetime-local"
            className="field mr-1 inline-block w-auto"
            disabled={oddsLocked}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <hr className="border-line" />

        <div>
          <span className="label">Wynik</span>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <div>
              <label className="mb-1 block text-center text-xs font-bold text-muted" htmlFor="result_a">Drużyna 1</label>
              <input
                id="result_a"
                type="number"
                step="1"
                min="0"
                className="field text-center"
                disabled={resultLocked}
                value={resultA}
                onChange={(e) => setResultA(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-center text-xs font-bold text-muted" htmlFor="result_b">Drużyna 2</label>
              <input
                id="result_b"
                type="number"
                step="1"
                min="0"
                className="field text-center"
                disabled={resultLocked}
                value={resultB}
                onChange={(e) => setResultB(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/matches" className="btn btn-ghost">Anuluj</Link>
          <button type="submit" className="btn btn-brand" disabled={update.isPending}>
            {update.isPending ? 'Zapisuję…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default function MatchEditPage() {
  const { id = '' } = useParams()
  const { isAdmin } = useAuth()
  const { data: match, isLoading, isError } = useMatch(id)

  if (!isAdmin) return <Navigate to={`/matches/${id}`} replace />
  if (isLoading) return <Loading />
  if (isError || !match) return <ErrorBox />

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fa fa-pencil text-brand" aria-hidden="true" /> Edycja meczu
      </h1>
      <section className="card card-body max-w-3xl">
        <EditForm match={match} />
      </section>
    </>
  )
}
