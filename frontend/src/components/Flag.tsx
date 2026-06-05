import { flagCode } from '@/lib/flags'

// Decorative team flag (the name is always shown next to it). Renders nothing for
// unknown teams / knockout placeholders. Uses the flag-icons CSS classes
// (`fi fi-<code>`), so every country ships with the package — no per-team asset to
// vendor when the schedule gains a new team. Sizing comes from `className`.
export default function Flag({ team, className = '' }: { team: string; className?: string }) {
  const code = flagCode(team)
  if (!code) return null
  return <span className={`fi fi-${code} ${className}`} aria-hidden="true" />
}