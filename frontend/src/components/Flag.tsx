import { flagCode } from '@/lib/flags'

// Decorative team flag (the name is always shown next to it). Renders nothing for
// unknown teams / knockout placeholders. Mirrors the Rails `image_tag` exactly:
// the SVGs live in public/flags/ (the same ~48 vendored from flag-icons).
export default function Flag({ team, className = '' }: { team: string; className?: string }) {
  const code = flagCode(team)
  if (!code) return null
  return <img src={`/flags/${code}.svg`} alt="" aria-hidden="true" loading="lazy" className={className} />
}
