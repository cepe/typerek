import type { ReactNode } from 'react'
import { usePersistentState } from '@/lib/usePersistentState'

// A one-time informational banner the user can dismiss for good. The dismissal
// is remembered in localStorage under `storageKey`, so the note shows once per
// device and never comes back. If the message changes and you want it to
// reappear, bump the key (e.g. add a version suffix). Uses the warm "highlight"
// tone reserved for notice banners, so it reads well in light and dark mode.
export default function InfoNote({
  storageKey,
  children,
}: {
  storageKey: string
  children: ReactNode
}) {
  const [dismissed, setDismissed] = usePersistentState(storageKey, '')

  if (dismissed === '1') return null

  return (
    <div role="note" className="mb-4 flex items-start gap-3 rounded-lg bg-highlight px-4 py-3 text-sm text-highlight-fg">
      <i className="fas fa-info-circle mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      <button
        type="button"
        onClick={() => setDismissed('1')}
        className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Zamknij"
      >
        <i className="fas fa-times" aria-hidden="true" />
      </button>
    </div>
  )
}