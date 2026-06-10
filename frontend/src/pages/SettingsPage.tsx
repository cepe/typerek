import { useState } from 'react'
import { useSettings } from '@/lib/settings'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Tabs are kept as an array so more settings groups can be added later; for now
// "Dostępność" is the only one.
const TABS = [{ id: 'a11y', label: 'Dostępność' }] as const
type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const { drzewkoMode, setDrzewkoMode, betLock, setBetLock } = useSettings()
  const [tab, setTab] = useState<TabId>('a11y')

  useDocumentTitle('Ustawienia')

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2">
        <i className="fas fa-cog text-brand" aria-hidden="true" /> Ustawienia
      </h1>

      <div className="mb-5 flex border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`tab${tab === item.id ? ' tab-active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'a11y' && (
        <section className="card divide-y divide-line/60">
          <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              checked={drzewkoMode}
              onChange={(event) => setDrzewkoMode(event.target.checked)}
            />
            <span className="leading-snug">
              <span className="block font-semibold text-ink">Drzewko mode</span>
              <span className="block text-muted">
                Tło Twojego wiersza w rankingu mocno miga, żeby nie dało się go przeoczyć.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              checked={betLock}
              onChange={(event) => setBetLock(event.target.checked)}
            />
            <span className="leading-snug">
              <span className="block font-semibold text-ink">Kłódka na typach</span>
              <span className="block text-muted">
                Pokazuje przy każdym typie małą kłódkę, którą możesz zablokować swój wybór, żeby
                przypadkiem go nie zmienić.
              </span>
            </span>
          </label>
        </section>
      )}
    </>
  )
}
