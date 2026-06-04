import { useEffect } from 'react'

const SUFFIX = 'Typerek'

// Sets document.title per page, mirroring the old `content_for :title` layout
// logic ("<page> · Typerek", or just "Typerek" when no page title is given).
// Pass undefined while data is still loading.
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
    return () => {
      document.title = SUFFIX
    }
  }, [title])
}
