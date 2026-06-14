import { flagCode } from '@/lib/flags'

// Decorative team flag (the name is always shown next to it). Renders nothing for
// unknown teams / knockout placeholders. Uses the flag-icons CSS classes
// (`fi fi-<code>`), so every country ships with the package — no per-team asset to
// vendor when the schedule gains a new team. Sizing comes from `className`.
//
// The faint ring outlines the flag against light backgrounds — otherwise mostly-
// white flags (e.g. Japan, a red circle on white) read as a floating dot. The ring
// is *not* inset, so it's drawn as a box-shadow just outside the flag rather than
// painted over its edge (which would make the flag look shrunk). `bg-cover`
// overrides flag-icons' default `contain` so the sprite fills the slightly-wider
// box edge to edge (negligible crop) and the ring hugs the flag exactly.
export default function Flag({ team, className = '' }: { team: string; className?: string }) {
  const code = flagCode(team)
  if (!code) return null
  return <span className={`fi fi-${code} bg-cover ring-1 ring-black/10 ${className}`} aria-hidden="true" />
}