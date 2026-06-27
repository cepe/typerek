import { useMemo, useState } from 'react'
import { useMatches, useRanking } from '@/api/hooks'
import MatchLine from '@/components/MatchLine'
import BetGrid from '@/components/BetGrid'
import { formatDateLong, groupByDay, pointsDisplay } from '@/lib/format'
import { OPERATOR_HELP, TOKEN_HELP, parseRules, rulePick, scoreRules } from '@/lib/ruleStrategy'

interface Props {
  rules: string
  onRulesChange: (rules: string) => void
}

const EXAMPLE = `w1 < 1.3 & r > 5 => r
w1 < w2 => w1
=> w2`

// Controls the rule strategy: a "virtual player" you parameterize with a little
// `condition => pick` program (see lib/ruleStrategy). The rules deterministically
// pick 1/X/2 (and the double chances) per match, scored live off the cached match
// list. The text lives in RankingPage so the strategy can also appear as a ranking
// row; this card is the editor plus a syntax cheat-sheet and a "Podejrzyj typy"
// preview of the rules' pick on every started match. A sibling of SeedStrategyCard;
// rendered only while the "Wirtualni gracze" overlay is on.
export default function RuleStrategyCard({ rules, onRulesChange }: Props) {
  const [showPicks, setShowPicks] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { data: matches } = useMatches()
  const { data: ranking } = useRanking()

  const finished = matches?.finished ?? []
  const hasRules = rules.trim() !== ''
  const parsed = useMemo(() => parseRules(rules), [rules])
  const score = useMemo(
    () => (!parsed.ok || finished.length === 0 ? null : scoreRules(parsed.rules, finished)),
    [parsed, finished],
  )

  // Started matches (finished + live), newest first — the same set the player and
  // virtual-strategy profiles show their picks over.
  const started = useMemo(() => {
    const fin = matches?.finished ?? []
    const live = (matches?.not_finished ?? []).filter((match) => match.started)
    return [...fin, ...live].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  }, [matches])

  const perfectScore = ranking?.perfect_score ?? 0
  const share = score && perfectScore > 0 ? Math.round((score.points / perfectScore) * 100) : null
  const canPreview = parsed.ok && started.length > 0

  return (
    <>
      <div className="card mb-4 overflow-hidden">
        <div className="card-header">
          <h3 className="flex items-center gap-2 text-sm font-bold text-muted">
            <i className="fas fa-code text-brand" aria-hidden="true" /> Strategia regułowa
          </h3>
        </div>
        <div className="space-y-3 px-4 py-3">
          <p className="text-xs text-muted">
            Napisz reguły <code className="rounded bg-surface px-1 py-0.5 text-ink">warunek =&gt; typ</code>, po
            jednej w linii. Czytane od góry — wygrywa pierwsza pasująca; reguła bez warunku to wartość domyślna.
            Punktowane jak realny zakład: trafiony typ daje swój kurs.
          </p>

          {/* Syntax cheat-sheet — collapsed by default, but the trigger and a one-line
              summary keep the available tokens/operators in view. */}
          <div className="rounded-lg border border-line bg-surface/40 text-xs">
            <button
              type="button"
              onClick={() => setShowHelp((value) => !value)}
              aria-expanded={showHelp}
              className="flex w-full items-center gap-1.5 px-3 py-2 font-medium text-muted hover:text-ink"
            >
              <i className={`fas fa-chevron-${showHelp ? 'up' : 'down'} text-[10px]`} aria-hidden="true" />
              Składnia
            </button>
            {showHelp && (
              <div className="space-y-2 border-t border-line/60 px-3 py-2">
                <p className="text-muted">
                  Zmienne (kursy) i typy używają tych samych nazw — po lewej stronie to kurs danego wyniku, po
                  <code className="mx-1 rounded bg-surface px-1 text-ink">=&gt;</code> to typ na ten wynik:
                </p>
                <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
                  {TOKEN_HELP.map(([token, label]) => (
                    <li key={token} className="flex items-baseline gap-2">
                      <code className="rounded bg-surface px-1.5 py-0.5 font-bold text-ink">{token}</code>
                      <span className="text-muted">{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted">
                  Operatory: <span className="text-ink">{OPERATOR_HELP}</span>
                </p>
                <p className="text-muted">
                  Można porównywać kurs z liczbą (<code className="rounded bg-surface px-1 text-ink">w1 &lt; 1.3</code>)
                  albo dwa kursy (<code className="rounded bg-surface px-1 text-ink">w1 &lt; w2</code>). Komentarze po{' '}
                  <code className="rounded bg-surface px-1 text-ink">#</code>.
                </p>
              </div>
            )}
          </div>

          <textarea
            value={rules}
            onChange={(event) => onRulesChange(event.target.value)}
            placeholder={EXAMPLE}
            aria-label="Reguły strategii"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            rows={4}
            className="field w-full resize-y font-mono text-sm leading-relaxed"
          />

          {!hasRules ? (
            <p className="text-sm text-muted">Wpisz reguły, aby zobaczyć wynik.</p>
          ) : !parsed.ok ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              <i className="fas fa-triangle-exclamation mr-1" aria-hidden="true" />
              {parsed.error}
            </p>
          ) : finished.length === 0 ? (
            <p className="text-sm text-muted">Brak rozegranych meczów — nie ma jeszcze czego punktować.</p>
          ) : score ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span>
                <span className="font-bold text-ink tabular-nums">{pointsDisplay(score.points)}</span> pkt
                {share != null && <span className="text-muted"> ({share}%)</span>} ·{' '}
                <span className="tabular-nums">{score.accuracy}</span> trafień
              </span>
              {canPreview && (
                <button
                  type="button"
                  onClick={() => setShowPicks((value) => !value)}
                  aria-expanded={showPicks}
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  <i className={`fas fa-chevron-${showPicks ? 'up' : 'down'} text-xs`} aria-hidden="true" />
                  {showPicks ? 'Ukryj typy' : 'Podejrzyj typy'}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {showPicks && canPreview && parsed.ok && (
        <div className="mb-4 space-y-4">
          {groupByDay(started).map((group) => (
            <section key={group.start} className="card overflow-hidden">
              <div className="card-header">
                <h3 className="text-sm font-bold text-muted">{formatDateLong(group.start)}</h3>
              </div>
              <div className="divide-y divide-line/60">
                {group.items.map((match) => (
                  // Always stacked (MatchLine over a full-width BetGrid): the ranking
                  // column is narrow (max-w-xl), so a side-by-side layout would squeeze
                  // MatchLine and misalign it here. Mirrors SeedStrategyCard's preview.
                  <div
                    key={match.id}
                    className={`flex flex-col gap-2 px-4 py-3 sm:px-5${
                      match.started && !match.finished ? ' bg-highlight/70' : ''
                    }`}
                  >
                    <MatchLine match={match} />
                    <BetGrid match={match} myAnswer={rulePick(parsed.rules, match)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
