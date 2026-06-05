import { useAuth } from '@/auth/AuthContext'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

// Mirrors homes/show.html.erb — the static info page.
const BET_DESCRIPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['1', 'wygrana pierwszej drużyny'],
  ['X', 'remis'],
  ['2', 'wygrana drugiej drużyny'],
  ['1X', 'wygrana pierwszej drużyny lub remis'],
  ['X2', 'wygrana drugiej drużyny lub remis'],
  ['12', 'wygrana którejś z drużyn (nie dojdzie do remisu)'],
]

export default function HomePage() {
  useDocumentTitle('Informacje')
  // Served by the backend (GET /api/v1/me) and therefore only available to
  // signed-in users; null when no invite link is configured.
  const discordUrl = useAuth().user?.discord_url

  return (
    <section className="card card-body mx-auto max-w-3xl space-y-4 leading-relaxed text-ink/90">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2">
          <i className="fas fa-info-circle text-brand" aria-hidden="true" /> Informacje
        </h1>
        {discordUrl && (
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 font-semibold text-white hover:bg-[#4752c4] hover:text-white"
          >
            <i className="fab fa-discord" aria-hidden="true" /> Dołącz do nas na Discordzie
          </a>
        )}
      </div>
      <p>
        Cześć! Strona powstała, aby w gronie przyjaciół można było typować wyniki nadchodzących meczów
        Mistrzostw Świata 2026. System działa podobnie do klasycznych zakładów bukmacherskich, z tą różnicą,
        że tutaj dostaje się punkty za każdy poprawnie wytypowany mecz.
      </p>
      <p>Dla każdego spotkania możemy wskazać jeden spośród 6 wyników:</p>
      <dl className="divide-y divide-line/60 overflow-hidden rounded-lg border border-line">
        {BET_DESCRIPTIONS.map(([key, description]) => (
          <div key={key} className="flex items-center gap-3 px-3 py-2">
            <span className="flex w-10 shrink-0 justify-center rounded-md bg-brand-tint py-1 text-sm font-bold text-brand">
              {key}
            </span>
            <span className="text-sm">{description}</span>
          </div>
        ))}
      </dl>
      <p>Po poprawnym wytypowaniu dostajemy punkty przypisane do zakładu, który wybraliśmy.</p>
      <p>
        Możemy zmieniać typy do momentu rozpoczęcia spotkania. Gdy mecz się rozpocznie, widzimy typy
        wszystkich uczestników dla danego meczu. Nie możemy wtedy modyfikować swojego wyboru.
      </p>
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Uwaga!</strong> W meczach fazy pucharowej typujemy wyniki tylko do 90. minuty spotkania. Typ
        „remis” jest jak najbardziej poprawny. Oznacza to, że drużyny po rozegraniu regulaminowych 90 minut
        będą miały dogrywkę.
      </div>
      <h3>Punktacje będą aktualizowane na bieżąco w miarę możliwości.</h3>
    </section>
  )
}
