import { useEffect, useState } from 'react'
import api from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Number of users with each setting switched on, keyed by the server setting name.
type SettingsStats = Record<string, number>

// Polish accusative of "osoba" for the "Włączone przez N osób" hint:
// 1 → osobę, 2–4 (but not 12–14) → osoby, otherwise → osób.
function peopleAccusative(count: number): string {
  if (count === 1) return '1 osobę'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} osoby`
  return `${count} osób`
}

function UsageHint({ count }: { count: number | undefined }) {
  if (count === undefined) return null
  const text = count === 0 ? 'Jeszcze nikt tego nie włączył' : `Włączone przez ${peopleAccusative(count)}`
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <i className="fas fa-user-group" aria-hidden="true" /> {text}
    </span>
  )
}

export default function SettingsPage() {
  const { drzewkoMode, setDrzewkoMode, betLock, setBetLock } = useSettings()
  const { user } = useAuth()
  const [stats, setStats] = useState<SettingsStats | null>(null)

  useDocumentTitle('Ustawienia')

  // How many people use each setting. Keyed on `user` (not the optimistic toggle
  // state) so the refetch runs only after a save is confirmed and `refresh()` has
  // updated the user — otherwise it would race the PATCH and read a stale count.
  useEffect(() => {
    api
      .get<SettingsStats>('/me/settings/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [user])

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-cog text-brand" aria-hidden="true" /> Ustawienia
      </h1>

      <section className="card divide-y divide-line/60">
        <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            checked={drzewkoMode}
            onChange={(event) => setDrzewkoMode(event.target.checked)}
          />
          <span className="leading-snug">
            <span className="block font-semibold text-ink">Drzewko mode</span>
            <span className="block text-muted">
              Tło Twojego wiersza w rankingu mocno miga, żeby nie dało się go przeoczyć.
            </span>
            <UsageHint count={stats?.drzewko_mode} />
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            checked={betLock}
            onChange={(event) => setBetLock(event.target.checked)}
          />
          <span className="leading-snug">
            <span className="block font-semibold text-ink">Kłódka na typach</span>
            <span className="block text-muted">
              Pokazuje przy każdym typie małą kłódkę, którą możesz zablokować swój wybór, żeby
              przypadkiem go nie zmienić.
            </span>
            <UsageHint count={stats?.bet_lock} />
          </span>
        </label>
      </section>
    </>
  )
}