import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import api, { apiErrorMessage } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import Alert from '@/components/Alert'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Admin-only: compose and send a push notification to every opted-in user. Handy for
// announcements and for testing the whole delivery path end to end.
export default function AdminPushPage() {
  const { isAdmin } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle('Powiadomienia')

  // Belt-and-braces: the nav link is admin-gated and the backend authorizes too, but
  // guard the route as well so a non-admin who types the URL just bounces home.
  if (!isAdmin) return <Navigate to="/" replace />

  const canSend = title.trim() !== '' && body.trim() !== '' && !sending

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setNotice(null)
    setError(null)
    setSending(true)
    try {
      await api.post('/push/broadcast', {
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
      })
      setNotice('Powiadomienie wysłane do wszystkich z włączonymi powiadomieniami.')
      setTitle('')
      setBody('')
      setUrl('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-bullhorn text-brand" aria-hidden="true" /> Powiadomienia
      </h1>

      {notice && (
        <Alert kind="notice" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert kind="alert" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-5">
        <p className="text-sm text-muted">
          Wyślij powiadomienie push do wszystkich użytkowników, którzy włączyli je w Ustawieniach.
        </p>

        <label className="block">
          <span className="label">Tytuł</span>
          <input
            type="text"
            className="field"
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="np. Nowe mecze dodane!"
          />
        </label>

        <label className="block">
          <span className="label">Treść</span>
          <textarea
            className="field"
            rows={3}
            value={body}
            maxLength={200}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Treść powiadomienia"
          />
        </label>

        <label className="block">
          <span className="label">Link (opcjonalnie)</span>
          <input
            type="text"
            className="field"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="/matches"
          />
        </label>

        <button type="submit" className="btn btn-brand" disabled={!canSend}>
          {sending ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Wysyłanie…
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane" aria-hidden="true" /> Wyślij do wszystkich
            </>
          )}
        </button>
      </form>
    </>
  )
}
