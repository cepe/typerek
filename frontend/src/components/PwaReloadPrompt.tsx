import { useRegisterSW } from 'virtual:pwa-register/react'

// Bottom toast driven by the service worker lifecycle. With registerType 'prompt'
// the new SW installs but waits; we surface a button so the user reloads on their
// own terms (never mid-bet). Also confirms once when the app is ready offline.
export default function PwaReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 px-4"
    >
      <div className="card flex w-full items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-ink">
          {needRefresh ? 'Dostępna nowa wersja aplikacji.' : 'Aplikacja gotowa do pracy offline.'}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {needRefresh && (
            <button type="button" className="btn btn-brand btn-sm" onClick={() => void updateServiceWorker(true)}>
              Odśwież
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={close} aria-label="Zamknij">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
