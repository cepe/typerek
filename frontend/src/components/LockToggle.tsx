import { useToggleLock } from '@/api/hooks'
import { useSettings } from '@/lib/settings'
import type { Match } from '@/api/types'

// A small padlock that locks the viewer's bet against accidental changes.
// Opt-in via Settings → Dostępność. Shown only once a bet exists and while the
// match is still open — after kickoff the bet is frozen anyway. Closed padlock =
// locked (pills read-only); open = editable. Clicking toggles the lock.
export default function LockToggle({ match }: { match: Match }) {
  const { betLock } = useSettings()
  const toggle = useToggleLock()
  if (!betLock || !match.my_answer || match.started) return null

  const locked = match.my_locked
  return (
    <button
      type="button"
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ matchId: match.id, locked: !locked })}
      aria-label={locked ? 'Odblokuj typ' : 'Zablokuj typ'}
      title={locked ? 'Typ zablokowany — kliknij, aby odblokować' : 'Zablokuj typ przed przypadkową zmianą'}
      className={`bet-lock${locked ? ' bet-lock-on' : ''}`}
    >
      <i className={`fas ${locked ? 'fa-lock' : 'fa-lock-open'}`} aria-hidden="true" />
    </button>
  )
}
