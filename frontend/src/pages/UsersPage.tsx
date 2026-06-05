import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import {
  useCreateInvitation,
  useDeleteUser,
  useResendInvitation,
  useToggleFin,
  useUsers,
} from '@/api/hooks'
import { apiErrorMessage } from '@/api/client'
import { ErrorBox, Loading } from '@/components/Status'
import Alert from '@/components/Alert'
import type { InvitationCreated, User } from '@/api/types'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function StatusBadge({ user }: { user: User }) {
  return user.active ? (
    <span className="badge badge-success">Aktywny</span>
  ) : (
    <span className="badge badge-warning">Zaproszony</span>
  )
}

function FinToggle({ user }: { user: User }) {
  const toggle = useToggleFin()
  return (
    <button type="button" title="Kliknij, aby przełączyć" disabled={toggle.isPending} onClick={() => toggle.mutate(user.id)}>
      {user.fin ? (
        <span className="badge badge-success cursor-pointer">Potwierdzony</span>
      ) : (
        <span className="badge badge-danger cursor-pointer">Niepotwierdzony</span>
      )}
    </button>
  )
}

// Mirrors users/index.html.erb (+ the activation-link card from users/create.html.erb).
export default function UsersPage() {
  const { user: me } = useAuth()
  const { data: users, isLoading, isError } = useUsers()
  const createInvitation = useCreateInvitation()
  const resend = useResendInvitation()
  const deleteUser = useDeleteUser()
  const [username, setUsername] = useState('')
  const [created, setCreated] = useState<InvitationCreated | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const createdRef = useRef<HTMLElement>(null)

  useDocumentTitle('Zaproszenia')

  // The link card renders at the top of the page, but "Nowy link" can be
  // clicked far down the user list — scroll the card into view so it's clear a
  // fresh invitation was generated.
  useEffect(() => {
    if (created) createdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [created])

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const result = await createInvitation.mutateAsync(username)
      setCreated(result)
      setUsername('')
      setCopied(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const onResend = async (id: number) => {
    if (!window.confirm('Czy na pewno chcesz wygenerować ponownie link z zaproszeniem?')) return
    setError(null)
    try {
      const result = await resend.mutateAsync(id)
      setCreated(result)
      setCopied(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const onDelete = (id: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć użytkownika?')) return
    deleteUser.mutate(id)
  }

  const copyLink = async () => {
    if (!created) return
    await navigator.clipboard.writeText(created.url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="far fa-envelope text-brand" aria-hidden="true" /> Zaproszenia
      </h1>

      {error && (
        <Alert kind="alert" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <section className="card card-body mb-8">
        <form onSubmit={onCreate}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label" htmlFor="invite-username">
                Login
              </label>
              <input
                id="invite-username"
                className="field"
                autoCapitalize="none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-brand" disabled={createInvitation.isPending}>
              Generuj zaproszenie
            </button>
          </div>
        </form>
      </section>

      {created && (
        <section ref={createdRef} className="card card-body mb-8">
          <p className="mb-2 text-muted">Utworzono konto. Link aktywacyjny:</p>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
              <span className="text-xs font-semibold text-muted">Link aktywacyjny</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={copyLink}>
                <i className="fas fa-copy" aria-hidden="true" /> {copied ? 'Skopiowano!' : 'Kopiuj'}
              </button>
            </div>
            <pre
              className="p-3 text-sm text-ink"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word' }}
            >
              {created.url}
            </pre>
          </div>
        </section>
      )}

      <h2 className="mb-4 flex items-center gap-2">
        <i className="fas fa-users text-brand" aria-hidden="true" /> Lista użytkowników{' '}
        <span className="badge-count">{users?.length ?? 0}</span>
      </h2>

      {isLoading ? (
        <Loading />
      ) : isError || !users ? (
        <ErrorBox message="Brak uprawnień lub błąd ładowania" />
      ) : (
        <section className="card overflow-hidden">
          <div className="user-head">
            <span>Użytkownik</span>
            <span>Stan konta</span>
            <span>Potwierdzenie</span>
            <span className="justify-self-end">Akcje</span>
          </div>
          <div className="divide-y divide-line/60">
            {users.map((user) => (
              <div key={user.id} className="user-row">
                <div className="ur-user">
                  <Link to={`/users/${user.id}`} className="block truncate font-semibold text-ink hover:text-brand">
                    {user.username}
                  </Link>
                  {user.invited_by && (
                    <div className="truncate text-xs text-muted">zaproszony przez {user.invited_by}</div>
                  )}
                </div>
                <div className="ur-status">
                  <StatusBadge user={user} />
                </div>
                <div className="ur-pay">
                  <FinToggle user={user} />
                </div>
                <div className="ur-actions">
                  {me?.id !== user.id && (
                    <>
                      <button type="button" className="btn-action" onClick={() => onResend(user.id)}>
                        <i className="fas fa-arrows-rotate" aria-hidden="true" /> Nowy link
                      </button>
                      <button type="button" className="btn-action btn-action-danger" onClick={() => onDelete(user.id)}>
                        <i className="fas fa-trash" aria-hidden="true" /> Usuń
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
