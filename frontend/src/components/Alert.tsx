import type { ReactNode } from 'react'

// Flash message, mirroring the alert/notice banner from the Rails layout.
export default function Alert({
  kind,
  children,
  onClose,
}: {
  kind: 'notice' | 'alert'
  children: ReactNode
  onClose?: () => void
}) {
  const tone = kind === 'notice' ? 'bg-brand-tint text-brand-dark' : 'bg-danger-tint text-danger'
  return (
    <div role="alert" className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ${tone}`}>
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Zamknij">
          <i className="fas fa-times" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
