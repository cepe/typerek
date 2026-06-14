import { flagCode } from '@/lib/flags'

// Decorative team flag (the name is always shown next to it). Renders nothing for
// unknown teams / knockout placeholders. Uses the flag-icons CSS classes
// (`fi fi-<code>`), so every country ships with the package — no per-team asset to
// vendor when the schedule gains a new team. Sizing comes from `className`.
//
// The faint inset ring outlines the flag against light backgrounds — otherwise
// mostly-white flags (e.g. Japan, a red circle on white) read as a floating dot.
// A ring draws as a box-shadow, so it follows the rounded corners without nudging
// the background-image sizing the way a `border` would.
//
// `bg-cover` overrides flag-icons' default `contain`: the boxes <Flag> is given
// (~1.4 aspect) are a touch wider than the 4:3 sprite, so `contain` would letterbox
// the flag and leave the ring floating outside it. `cover` fills the box edge to
// edge (negligible crop), so the ring hugs the flag exactly.
export default function Flag({ team, className = '' }: { team: string; className?: string }) {
  const code = flagCode(team)
  if (!code) return null
  return <span className={`fi fi-${code} bg-cover ring-1 ring-inset ring-black/10 ${className}`} aria-hidden="true" />
}