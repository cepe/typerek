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
  const [sending, setSending] = useState(false)
  const [triggering, setTriggering] = useState(false)
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
      await api.post('/push/broadcast', { title: title.trim(), body: body.trim() })
      setNotice('Powiadomienie wysłane do wszystkich z włączonymi powiadomieniami.')
      setTitle('')
      setBody('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  // Manually trigger the unbet-match reminder job (the one the scheduler runs every
  // 15 min). Idempotent server-side, so re-clicking won't double-send.
  const onTriggerReminders = async () => {
    setNotice(null)
    setError(null)
    setTriggering(true)
    try {
      await api.post('/push/reminders')
      setNotice('Zlecono wysłanie przypomnień o niezatypowanych meczach.')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setTriggering(false)
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

      <section className="card mt-4 space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold text-ink">Przypomnienia o niezatypowanych meczach</h2>
          <p className="text-sm text-muted">
            Ręcznie uruchom wysyłkę przypomnień — to samo zadanie, które planowo działa co 15 minut.
            Trafią tylko do osób z niezatypowanym meczem w oknie 24h / 6h / 1h przed startem, z
            pominięciem już wysłanych.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={onTriggerReminders} disabled={triggering}>
          {triggering ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Wysyłanie…
            </>
          ) : (
            <>
              <i className="fas fa-bell" aria-hidden="true" /> Wyślij przypomnienia teraz
            </>
          )}
        </button>
      </section>
    </>
  )
}
