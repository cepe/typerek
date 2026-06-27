import { useCallback, useEffect, useState } from 'react'
import api from '@/api/client'
import { useSettings } from '@/lib/settings'
import { usePushSubscription, pushSupported } from '@/lib/usePushSubscription'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import Alert from '@/components/Alert'
import type { PushDevice } from '@/api/types'
import { DARK_END_HOUR, DARK_START_HOUR, type ThemePreference } from '@/lib/theme'

// The three dark-mode choices, in display order. 'light' is the default (off).
const THEME_OPTIONS: { value: ThemePreference; title: string; hint: string }[] = [
  { value: 'light', title: 'Wyłączony', hint: 'Zawsze jasny motyw.' },
  { value: 'dark', title: 'Zawsze włączony', hint: 'Ciemny motyw przez cały czas.' },
  {
    value: 'auto',
    title: 'Zależnie od godziny',
    hint: `Ciemny wieczorem i w nocy (${DARK_START_HOUR}:00–${DARK_END_HOUR}:00), jasny w dzień.`,
  },
]

// Number of users with each setting switched on, keyed by the server setting name.
type SettingsStats = {
  drzewko_mode: number
  bet_lock: number
  push_enabled: number
  match_order_by_ranking: number
  virtual_players: number
  seed_strategy: number
  rule_strategy: number
  // How many users have dark mode on (theme 'dark' or 'auto').
  theme: number
}

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

// Best-effort friendly name from a User-Agent string, e.g. "Chrome · macOS".
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Nieznane urządzenie'
  const ua = userAgent
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Przeglądarka'
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'nieznany system'
  return `${browser} · ${os}`
}

function formatDeviceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    drzewkoMode,
    setDrzewkoMode,
    betLock,
    setBetLock,
    matchOrderByRanking,
    setMatchOrderByRanking,
    virtualPlayers,
    setVirtualPlayers,
    seedStrategy,
    setSeedStrategy,
    ruleStrategy,
    setRuleStrategy,
    pushResults,
    setPushResults,
    pushReminders,
    setPushReminders,
  } = useSettings()
  const { subscribe, unsubscribe, currentEndpoint } = usePushSubscription()
  const [stats, setStats] = useState<SettingsStats | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  // This device's push endpoint (null when not subscribed) drives the per-device
  // toggle and marks which row in the device list is the current browser.
  const [currentEp, setCurrentEp] = useState<string | null>(null)
  const [devices, setDevices] = useState<PushDevice[]>([])
  const deviceSubscribed = currentEp !== null
  const supported = pushSupported()

  useDocumentTitle('Ustawienia')

  // The signed-in user's registered devices (shown so you can see what's configured).
  const refreshDevices = useCallback(() => {
    api
      .get<PushDevice[]>('/push/subscriptions')
      .then(setDevices)
      .catch(() => setDevices([]))
  }, [])

  // Reflect this device's actual subscription state and load the device list on mount.
  useEffect(() => {
    void currentEndpoint().then(setCurrentEp)
    refreshDevices()
  }, [currentEndpoint, refreshDevices])

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

  // Theme is the only non-boolean setting: the usage count tracks "dark mode on"
  // (dark or auto), so only crossing the light <-> (dark|auto) line changes it.
  // Bump optimistically on that crossing, then reconcile with the server.
  const handleThemeChange = (next: ThemePreference) => {
    const wasOn = theme !== 'light'
    const nowOn = next !== 'light'
    if (wasOn !== nowOn) {
      setStats((prev) =>
        prev ? { ...prev, theme: Math.max(0, prev.theme + (nowOn ? 1 : -1)) } : prev,
      )
    }
    void setTheme(next).finally(refreshStats)
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
      } else {
        await unsubscribe()
      }
      // Re-read this device's state and refresh the device list after the change.
      setCurrentEp(await currentEndpoint())
      refreshDevices()
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

      <section className="card mb-4 px-4 py-4 sm:px-5">
        <fieldset>
          <legend className="font-semibold text-ink">Ciemny motyw</legend>
          <p className="mt-0.5 text-muted">
            Ciemniejsze kolory aplikacji. „Zależnie od godziny” włącza je wieczorem i w nocy.
          </p>
          <div className="mt-3 space-y-2">
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="theme"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
                  checked={theme === option.value}
                  onChange={() => handleThemeChange(option.value)}
                />
                <span className="leading-snug">
                  <span className="block font-medium text-ink">{option.title}</span>
                  <span className="block text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <UsageHint count={stats?.theme} />
        </fieldset>
      </section>

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

          {devices.length > 0 && (
            <div className="border-t border-line/40 bg-surface/40 px-4 py-3 pl-12 sm:px-5 sm:pl-14">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Twoje urządzenia
              </p>
              <ul className="space-y-2">
                {devices.map((device) => {
                  const isCurrent = device.endpoint === currentEp
                  return (
                    <li key={device.id} className="flex items-center justify-between gap-3">
                      <span className="leading-tight">
                        <span className="block text-sm font-medium text-ink">
                          {deviceLabel(device.user_agent)}
                          {isCurrent && <span className="badge badge-success ml-2">to urządzenie</span>}
                        </span>
                        <span className="block text-xs text-muted">
                          dodano {formatDeviceDate(device.created_at)}
                        </span>
                      </span>
                      {isCurrent && (
                        <button
                          type="button"
                          className="btn-action btn-action-danger shrink-0"
                          onClick={() => handlePushToggle(false)}
                          disabled={pushBusy}
                        >
                          <i className="fas fa-xmark" aria-hidden="true" /> Wyłącz
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
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

        <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            checked={matchOrderByRanking}
            onChange={(event) =>
              toggle('match_order_by_ranking', setMatchOrderByRanking, event.target.checked)
            }
          />
          <span className="leading-snug">
            <span className="block font-semibold text-ink">Typy w kolejności rankingu</span>
            <span className="block text-muted">
              W widoku meczu lista typów uczestników jest ułożona według pozycji w rankingu, a nie
              alfabetycznie — łatwiej odczytać ranking po meczu.
            </span>
            <UsageHint count={stats?.match_order_by_ranking} />
          </span>
        </label>

        <div>
          <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              checked={virtualPlayers}
              onChange={(event) => toggle('virtual_players', setVirtualPlayers, event.target.checked)}
            />
            <span className="leading-snug">
              <span className="block font-semibold text-ink">Wirtualni gracze</span>
              <span className="block text-muted">
                Dodaje do rankingu strategie-benchmarki (Faworyt, Underdog, Drugi kurs, Remis), żeby
                porównać swoje typy. To samo można włączyć przyciskiem na widoku rankingu.
              </span>
              <UsageHint count={stats?.virtual_players} />
            </span>
          </label>

          {virtualPlayers && (
            <>
              <div className="border-t border-line/40 bg-surface/40 px-4 py-3 pl-12 sm:px-5 sm:pl-14">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                    checked={seedStrategy}
                    onChange={(event) => toggle('seed_strategy', setSeedStrategy, event.target.checked)}
                  />
                  <span className="leading-snug">
                    <span className="block text-sm font-medium text-ink">Strategia z seeda</span>
                    <span className="block text-xs text-muted">
                      Eksperymentalna strategia sterowana słowem — z jego seeda losowane są typy 1/X/2.
                      Pojawia się w rankingu jako dodatkowy gracz. Domyślnie ukryta.
                    </span>
                    <UsageHint count={stats?.seed_strategy} />
                  </span>
                </label>
              </div>

              <div className="border-t border-line/40 bg-surface/40 px-4 py-3 pl-12 sm:px-5 sm:pl-14">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                    checked={ruleStrategy}
                    onChange={(event) => toggle('rule_strategy', setRuleStrategy, event.target.checked)}
                  />
                  <span className="leading-snug">
                    <span className="block text-sm font-medium text-ink">Strategia regułowa</span>
                    <span className="block text-xs text-muted">
                      Eksperymentalna strategia sterowana regułami „warunek =&gt; typ” (np. w1 &lt; 1.3 &amp; r &gt; 5
                      =&gt; r). Pojawia się w rankingu jako dodatkowy gracz. Domyślnie ukryta.
                    </span>
                    <UsageHint count={stats?.rule_strategy} />
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}