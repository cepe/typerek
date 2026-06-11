import { useCallback, useEffect, useState } from 'react'
import api from '@/api/client'
import { useSettings } from '@/lib/settings'
import { usePushSubscription, pushSupported } from '@/lib/usePushSubscription'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import Alert from '@/components/Alert'

// Number of users with each setting switched on, keyed by the server setting name.
type SettingsStats = { drzewko_mode: number; bet_lock: number; push_enabled: number }

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
  const {
    drzewkoMode,
    setDrzewkoMode,
    betLock,
    setBetLock,
    pushResults,
    setPushResults,
    pushReminders,
    setPushReminders,
  } = useSettings()
  const { subscribe, unsubscribe, isSubscribed } = usePushSubscription()
  const [stats, setStats] = useState<SettingsStats | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  // Whether *this device* is subscribed — the per-device toggle reflects this, not the
  // account-wide push_enabled flag (which the backend derives from any subscription).
  const [deviceSubscribed, setDeviceSubscribed] = useState(false)
  const supported = pushSupported()

  useDocumentTitle('Ustawienia')

  // Reflect this device's actual subscription state on mount.
  useEffect(() => {
    void isSubscribed().then(setDeviceSubscribed)
  }, [isSubscribed])

  // Pull the authoritative usage counts (cheap endpoint, ~30ms). Called on mount
  // and again once a toggle settles, to reconcile the optimistic bump below.
  const refreshStats = useCallback(() => {
    api
      .get<SettingsStats>('/me/settings/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  useEffect(refreshStats, [refreshStats])

  // Flip a setting and adjust its count by ±1 immediately, so "Włączone przez N
  // osób" tracks the click instead of waiting on the round trip; then reconcile
  // with the server once the save settles (which also corrects a rolled-back one).
  const toggle = (
    key: keyof SettingsStats,
    set: (value: boolean) => Promise<void>,
    checked: boolean,
  ) => {
    setStats((prev) =>
      prev ? { ...prev, [key]: Math.max(0, prev[key] + (checked ? 1 : -1)) } : prev,
    )
    void set(checked).finally(refreshStats)
  }

  // Per-device opt-in: enabling asks for browser permission and subscribes *this*
  // device; disabling tears that subscription down. The backend derives the account's
  // push_enabled flag from whether any device remains, so we just refresh the usage
  // count afterwards rather than guessing it optimistically.
  const handlePushToggle = async (checked: boolean) => {
    setPushError(null)
    setPushBusy(true)
    try {
      if (checked) {
        const ok = await subscribe()
        if (!ok) {
          setPushError('Nie udało się włączyć powiadomień. Sprawdź, czy zezwoliłeś na nie w przeglądarce.')
          return
        }
        setDeviceSubscribed(true)
      } else {
        await unsubscribe()
        setDeviceSubscribed(false)
      }
      refreshStats()
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-cog text-brand" aria-hidden="true" /> Ustawienia
      </h1>

      {pushError && (
        <Alert kind="alert" onClose={() => setPushError(null)}>
          {pushError}
        </Alert>
      )}

      <section className="card divide-y divide-line/60">
        <div>
          <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              checked={deviceSubscribed}
              disabled={!supported || pushBusy}
              onChange={(event) => handlePushToggle(event.target.checked)}
            />
            <span className="leading-snug">
              <span className="block font-semibold text-ink">Powiadomienia push na tym urządzeniu</span>
              <span className="block text-muted">
                Powiadomienia o meczach — działają też przy zamkniętej aplikacji. Każde urządzenie
                włączasz osobno; po włączeniu wybierz poniżej, co chcesz dostawać.
              </span>
              {!supported && (
                <span className="mt-1.5 block text-xs font-medium text-muted">
                  Ta przeglądarka nie obsługuje powiadomień. Na iPhone/iPad dodaj aplikację do ekranu
                  głównego, aby je włączyć.
                </span>
              )}
              <UsageHint count={stats?.push_enabled} />
            </span>
          </label>

          {deviceSubscribed && (
            <div className="space-y-3 border-t border-line/40 bg-surface/40 px-4 py-3 pl-12 sm:px-5 sm:pl-14">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  checked={pushResults}
                  onChange={(event) => void setPushResults(event.target.checked)}
                />
                <span className="leading-snug">
                  <span className="block text-sm font-medium text-ink">Wyniki meczów</span>
                  <span className="block text-xs text-muted">
                    Gdy ktoś wpisze wynik meczu i zaktualizuje się ranking.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  checked={pushReminders}
                  onChange={(event) => void setPushReminders(event.target.checked)}
                />
                <span className="leading-snug">
                  <span className="block text-sm font-medium text-ink">Przypomnienia o meczach</span>
                  <span className="block text-xs text-muted">
                    Gdy zbliża się mecz, którego jeszcze nie wytypowałeś (24h, 6h i 1h przed startem).
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            checked={drzewkoMode}
            onChange={(event) => toggle('drzewko_mode', setDrzewkoMode, event.target.checked)}
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
            onChange={(event) => toggle('bet_lock', setBetLock, event.target.checked)}
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