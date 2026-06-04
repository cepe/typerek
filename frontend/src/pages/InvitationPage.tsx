import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { apiErrorMessage } from '@/api/client'
import { useInvitation } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import Alert from '@/components/Alert'
import { Loading } from '@/components/Status'
import type { AuthResult } from '@/api/types'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Mirrors invitations/show.html.erb — validate the token, then set the password.
export default function InvitationPage() {
  const { token = '' } = useParams()
  const { applyAuth } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useInvitation(token)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentTitle('Ustaw hasło')

  if (isLoading) return <Loading />

  if (isError || !data) {
    return (
      <div className="container-narrow py-10">
        <Alert kind="alert">Nieprawidłowy lub wygasły token</Alert>
      </div>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.post<AuthResult>(`/invitations/${token}/accept`, {
        password,
        password_confirmation: confirmation,
      })
      applyAuth(result)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Nie udało się ustawić hasła'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-narrow py-10">
      <section className="card card-body">
        {error && (
          <Alert kind="alert" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit}>
          <h2 className="text-center">Ustaw hasło</h2>
          <p className="mb-6 mt-1 text-center text-muted">
            Cześć <span className="font-semibold text-ink">{data.username}</span>!
          </p>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="password">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                className="field"
                autoComplete="off"
                placeholder="Hasło"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password_confirmation">
                Powtórz hasło
              </label>
              <input
                id="password_confirmation"
                type="password"
                className="field"
                autoComplete="off"
                placeholder="Powtórz hasło"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-brand btn-block" disabled={submitting}>
              Zapisz hasło
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
