import type { BetType, Match } from '@/api/types'
import { winningBets } from './bets'

// A tiny rule language for a "virtual player": a list of `condition => pick` lines,
// read top-down, first match wins. A line without a condition is the default. The
// pick is scored like a real bet (see scoreRules), so you can hunt for a rule set
// that would have paid off over the finished matches. A sibling of the seed
// strategy (see seedStrategy.ts) — same scoring, but driven by explicit rules.
//
// Example:
//   w1 < 1.3 & r > 5 => r     # big favourite but a juicy draw price → back the draw
//   w1 < w2          => w1     # home favourite → back the home win
//                    => w2     # otherwise → back the away win

// The six outcomes a rule can name. On the left of a comparison a token stands for
// that outcome's odds; after `=>` it means "bet that outcome". The same small set
// both sides keeps the language unambiguous — no bare `1`/`2` that could be read as
// a number. The keys double as Odds keys / BetTypes.
const OUTCOMES: Record<string, BetType> = {
  w1: 'win_a',
  r: 'tie',
  w2: 'win_b',
  w1r: 'win_tie_a',
  rw2: 'win_tie_b',
  w12: 'not_tie',
}

// Token → human label, the single source of truth for the UI's syntax help.
export const TOKEN_HELP: ReadonlyArray<readonly [string, string]> = [
  ['w1', 'wygrana gospodarzy (1)'],
  ['r', 'remis (X)'],
  ['w2', 'wygrana gości (2)'],
  ['w1r', '1 lub remis (1X)'],
  ['rw2', 'remis lub 2 (X2)'],
  ['w12', 'bez remisu (12)'],
]

export const OPERATOR_HELP = '< · <= · > · >= · = ·  łączenie: & (oraz) · | (lub)'

type Op = '<' | '<=' | '>' | '>=' | '='

type Operand = { kind: 'num'; value: number } | { kind: 'odds'; outcome: BetType }

interface Comparison {
  left: Operand
  op: Op
  right: Operand
}

// A condition is an OR of ANDs of comparisons (`&` binds tighter than `|`). A null
// condition is the default rule, which always matches.
type Condition = Comparison[][]

export interface Rule {
  condition: Condition | null
  pick: BetType
}

export type ParseResult = { ok: true; rules: Rule[] } | { ok: false; error: string }

export interface RuleScore {
  points: number
  accuracy: number
}

// Thrown while parsing, carrying a ready-to-show Polish message; caught and turned
// into a ParseResult by parseRules so callers never see the exception.
class RuleError extends Error {}

// One side of a comparison: a number literal, or an outcome token (its odds).
function operand(token: string): Operand | null {
  if (/^\d/.test(token)) {
    const value = Number(token)
    return Number.isFinite(value) ? { kind: 'num', value } : null
  }
  const outcome = OUTCOMES[token]
  return outcome ? { kind: 'odds', outcome } : null
}

const COMPARISON = /^([A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)\s*(<=|>=|==|=|<|>)\s*([A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)$/

function parseComparison(text: string, line: number): Comparison {
  const match = COMPARISON.exec(text.trim())
  if (!match) throw new RuleError(`Linia ${line}: nie rozumiem warunku „${text.trim()}”.`)
  const left = operand(match[1])
  if (!left) throw new RuleError(`Linia ${line}: nieznana nazwa „${match[1]}”.`)
  const right = operand(match[3])
  if (!right) throw new RuleError(`Linia ${line}: nieznana nazwa „${match[3]}”.`)
  return { left, op: (match[2] === '==' ? '=' : match[2]) as Op, right }
}

function parseCondition(text: string, line: number): Condition {
  return text.split('|').map((group) => {
    const parts = group.split('&').map((part) => part.trim())
    if (parts.some((part) => part === '')) {
      throw new RuleError(`Linia ${line}: pusty warunek wokół „&” lub „|”.`)
    }
    return parts.map((part) => parseComparison(part, line))
  })
}

// Parse a multi-line program into rules, or return the first error (with its line)
// for the UI to show. Blank lines and `#` comments are ignored.
export function parseRules(source: string): ParseResult {
  const rules: Rule[] = []
  try {
    source.split('\n').forEach((raw, index) => {
      const line = index + 1
      const text = raw.replace(/#.*$/, '').trim()
      if (text === '') return

      const arrow = text.indexOf('=>')
      if (arrow === -1) throw new RuleError(`Linia ${line}: brakuje „=>” (warunek => typ).`)

      const condText = text.slice(0, arrow).trim()
      const pickText = text.slice(arrow + 2).trim()
      const pick = OUTCOMES[pickText]
      if (!pick) {
        throw new RuleError(`Linia ${line}: „${pickText || '∅'}” to nie jest typ (użyj w1 r w2 w1r rw2 w12).`)
      }

      rules.push({ condition: condText === '' ? null : parseCondition(condText, line), pick })
    })
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, error: error.message }
    throw error
  }

  if (rules.length === 0) return { ok: false, error: 'Brak reguł — dodaj choć jedną: warunek => typ.' }
  return { ok: true, rules }
}

function evalOperand(op: Operand, match: Match): number | null {
  return op.kind === 'num' ? op.value : match.odds[op.outcome]
}

function evalComparison(comparison: Comparison, match: Match): boolean {
  const left = evalOperand(comparison.left, match)
  const right = evalOperand(comparison.right, match)
  // A comparison against a missing odd is simply false, so the rule falls through
  // to the next one (or the default) instead of the whole program failing.
  if (left == null || right == null) return false
  switch (comparison.op) {
    case '<':
      return left < right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '>=':
      return left >= right
    case '=':
      return left === right
  }
}

function conditionMatches(condition: Condition, match: Match): boolean {
  return condition.some((and) => and.every((comparison) => evalComparison(comparison, match)))
}

// The pick the rules make for one match: the first rule whose condition matches (a
// default rule always does), or null when none match — scored as no bet.
export function rulePick(rules: Rule[], match: Match): BetType | null {
  for (const rule of rules) {
    if (rule.condition == null || conditionMatches(rule.condition, match)) return rule.pick
  }
  return null
}

// Score the rules over the finished matches with the same rule as a real bet: the
// pick earns the match's odds for it when that outcome won, otherwise nothing.
// Mirrors scoreSeed / Typerek::Ranking::VirtualPlayers#score (odds rounded to 2dp).
export function scoreRules(rules: Rule[], finished: Match[]): RuleScore {
  let points = 0
  let accuracy = 0
  for (const match of finished) {
    const pick = rulePick(rules, match)
    if (pick == null) continue
    if (!winningBets(match.result_a, match.result_b).includes(pick)) continue
    const odds = match.odds[pick]
    if (odds == null) continue
    points += Math.round(odds * 100) / 100
    accuracy += 1
  }
  return { points: Math.round(points * 100) / 100, accuracy }
}
