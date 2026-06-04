import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { apiErrorMessage } from '@/api/client'
import Alert from '@/components/Alert'

// Mirrors sessions/new.html.erb.
export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(username, password)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Niepoprawny login lub hasło'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-narrow py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-white">
          T
        </div>
        <h1 className="text-2xl">
          Typerek <span className="font-normal text-muted">2026</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Typuj wyniki Mistrzostw Świata z przyjaciółmi.</p>
      </div>
      <section className="card card-body">
        {error && (
          <Alert kind="alert" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit}>
          <h2 className="mb-6 text-center">Zaloguj się</h2>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="username">
                Login
              </label>
              <input
                id="username"
                className="field"
                placeholder="Login"
                autoComplete="off"
                autoCapitalize="none"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                className="field"
                placeholder="Hasło"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-brand btn-block" disabled={submitting}>
              Zaloguj się
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
