import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useRankingHistory } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import { formatDateLong, formattedScore } from '@/lib/format'
import type { RankingHistoryMatch } from '@/api/types'

const COL_PX = 20
const MAX_X_TICKS = 12
const MOBILE_CHART_HEIGHT = 320
const DESKTOP_CHART_HEIGHT_PER_USER = 8
const DESKTOP_CHART_MIN_HEIGHT = 500
const DESKTOP_CHART_MAX_HEIGHT = 700

// Golden-angle hue stepping spreads colors evenly around the wheel so that
// even adjacent users get visually distinct lines, no matter how many series
// are plotted. Matches RankingPointsChart's palette for visual consistency
// between the two history charts.
const GOLDEN_ANGLE = 137.508

function userColor(colorIndex: number): string {
  const hue = (colorIndex * GOLDEN_ANGLE) % 360
  return `hsl(${hue.toFixed(0)}, 55%, 55%)`
}

// Emphasize the top/bottom of the standings, fade the middle pack — same
// rationale as RankingPointsChart's tierOpacity.
function tierOpacity(finalRank: number, total: number): number {
  const frac = finalRank / total
  return frac <= 0.15 || frac > 0.65 ? 0.3 : 0.13
}

interface PayloadEntry {
  dataKey: string
  value: number
  stroke: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: number
  payload?: PayloadEntry[]
  matches: RankingHistoryMatch[]
  userMap: Map<string, string>
  meId?: number
  hoveredUserId: string | null
}

function CustomTooltip({ active, label, payload, matches, userMap, meId, hoveredUserId }: CustomTooltipProps) {
  if (!active || label == null || !payload?.length) return null
  const match = matches[label - 1]
  if (!match) return null

  const score =
    match.result_a != null && match.result_b != null
      ? formattedScore(match.result_a, match.result_b)
      : '–:–'

  const hoveredEntry = hoveredUserId ? payload.find((p) => p.dataKey === hoveredUserId) : null
  const focusPosition = hoveredEntry?.value
  const tiedEntries = focusPosition != null
    ? payload.filter((p) => p.value === focusPosition)
    : hoveredEntry ? [hoveredEntry] : []

  return (
    <div className="card card-body w-52 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">
        Mecz #{label}: {match.team_a} {score} {match.team_b}
      </p>
      <p className="text-muted">{formatDateLong(match.start)}</p>
      {tiedEntries.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          {tiedEntries.map((entry, i) => (
            <div key={entry.dataKey} className="flex items-center gap-1.5">
              {i === 0 && (
                <span className="w-4 text-right font-bold tabular-nums text-ink">{entry.value}.</span>
              )}
              {i > 0 && <span className="w-4" />}
              <span className="inline-block h-2 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.stroke }} />
              <span className={`truncate ${entry.dataKey === String(meId) ? 'font-semibold text-brand' : 'text-ink'}`}>
                {userMap.get(entry.dataKey) ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function xTicks(matchCount: number): number[] {
  if (matchCount <= MAX_X_TICKS) return Array.from({ length: matchCount }, (_, i) => i + 1)
  const step = Math.ceil(matchCount / MAX_X_TICKS)
  const ticks: number[] = []
  for (let x = 1; x < matchCount; x += step) ticks.push(x)
  ticks.push(matchCount)
  return ticks
}

interface LegendProps {
  sortedSeries: { user: { id: number; username: string } }[]
  colorMap: Map<number, string>
  highlightedIds: Set<number>
  meId?: number
  onToggle: (id: number) => void
  onClear: () => void
  maxHeight?: number
}

function Legend({ sortedSeries, colorMap, highlightedIds, meId, onToggle, onClear, maxHeight }: LegendProps) {
  return (
    <div>
      {highlightedIds.size > 0 && (
        <div className="border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-brand hover:underline"
          >
            Wyczyść ({highlightedIds.size})
          </button>
        </div>
      )}
      <ul className="divide-y divide-line/60" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        {sortedSeries.map((s) => {
          const isMe = s.user.id === meId
          const color = isMe ? '#12A751' : (colorMap.get(s.user.id) ?? '#6b7280')
          const isSelected = highlightedIds.has(s.user.id)

          return (
            <li key={s.user.id}>
              <button
                type="button"
                onClick={() => onToggle(s.user.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  isSelected ? 'bg-surface font-semibold' : ''
                }`}
              >
                <span className="inline-block h-2.5 w-4 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <span className={`flex-1 truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
                  {s.user.username}
                  {isMe && <span className="ml-1 text-[10px] font-normal">(Ty)</span>}
                </span>
                {isSelected && (
                  <i className="fas fa-check text-brand" aria-hidden="true" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface Props {
  enabled: boolean
}

export default function RankingBumpChart({ enabled }: Props) {
  const { data, isLoading, isError } = useRankingHistory(enabled)
  const { user: me } = useAuth()
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(() =>
    me?.id != null ? new Set([me.id]) : new Set()
  )
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const { matches, series } = data

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak zakończonych meczów</div>
  }

  const sortedSeries = [...series].sort((a, b) =>
    a.user.username.localeCompare(b.user.username, undefined, { sensitivity: 'base' })
  )
  const colorMap = new Map(
    [...series].sort((a, b) => a.user.id - b.user.id).map((s, idx) => [s.user.id, userColor(idx)])
  )
  const userMap = new Map(series.map((s) => [String(s.user.id), s.user.username]))

  type Row = { x: number } & Record<string, number>
  const rows: Row[] = matches.map((_, i) => {
    const row: Row = { x: i + 1 }
    series.forEach((s) => { row[String(s.user.id)] = s.positions[i] })
    return row
  })

  const totalUsers = series.length
  const lastIdx = matches.length - 1
  const finalRankMap = new Map(series.map((s) => [s.user.id, s.positions[lastIdx] ?? totalUsers]))
  const rewarded = me?.rewarded_positions ?? 0
  const chartWidth = Math.max(matches.length * COL_PX, 600)
  const desktopChartHeight = Math.min(
    DESKTOP_CHART_MAX_HEIGHT,
    Math.max(DESKTOP_CHART_MIN_HEIGHT, totalUsers * DESKTOP_CHART_HEIGHT_PER_USER)
  )

  // Pick the smallest "nice" interval that yields ≤12 grid lines
  const niceIntervals = [1, 2, 5, 10, 20, 25, 50]
  const gridInterval = niceIntervals.find((i) => Math.ceil(totalUsers / i) <= 12) ?? 50
  const yTicks = Array.from({ length: Math.floor(totalUsers / gridInterval) }, (_, i) => (i + 1) * gridInterval)
  if (yTicks[0] !== 1) yTicks.unshift(1)

  const toggleHighlight = (id: number) =>
    setHighlightedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearHighlight = () => setHighlightedIds(new Set())

  const xDomain: [number, number] = matches.length === 1 ? [0.5, 1.5] : [1, matches.length]
  const showDots = matches.length <= 5

  const sortedForRender = [...series].sort((a, b) => {
    const rank = (s: { user: { id: number } }) => {
      if (s.user.id === me?.id)           return 2
      if (highlightedIds.has(s.user.id))  return 1
      return 0
    }
    return rank(a) - rank(b)
  })

  const chart = (
    <LineChart
      data={rows}
      margin={{ top: 20, right: 24, bottom: 16, left: 8 }}
      onMouseLeave={() => setHoveredUserId(null)}
    >
      <CartesianGrid horizontal vertical={false} strokeDasharray="4 4" stroke="#E4E4E4" />
      <XAxis dataKey="x" type="number" domain={xDomain} ticks={xTicks(matches.length)} />
      <YAxis reversed domain={[1, totalUsers]} ticks={yTicks} allowDecimals={false} width={32} />
      {/* Cutoff between the prize zone (positions 1..N) and the rest. Drawn at the
          half-step so it sits in the gap between the Nth and (N+1)th place lines. */}
      {rewarded > 0 && rewarded < totalUsers && (
        <ReferenceLine
          y={rewarded + 0.5}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          ifOverflow="extendDomain"
          label={{ value: 'strefa nagród', position: 'insideTopLeft', fill: '#b45309', fontSize: 10 }}
        />
      )}
      <Tooltip
        content={
          <CustomTooltip matches={matches} userMap={userMap} meId={me?.id} hoveredUserId={hoveredUserId} />
        }
      />
      {sortedForRender.map((s) => {
        const uid = String(s.user.id)
        const isMe = s.user.id === me?.id
        const color = isMe ? '#12A751' : (colorMap.get(s.user.id) ?? '#6b7280')
        const isHighlighted = highlightedIds.has(s.user.id)
        const finalRank = finalRankMap.get(s.user.id) ?? totalUsers
        // Selecting a user only emphasizes that one line; everyone else
        // always keeps their normal tier opacity, so the background doesn't
        // shift just because something got selected (see RankingPointsChart).

        return (
          <Line
            key={uid}
            dataKey={uid}
            stroke={color}
            strokeWidth={isHighlighted ? 2.5 : 1.5}
            dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{
              r: 4,
              onMouseEnter: () => setHoveredUserId(uid),
              onMouseLeave: () => setHoveredUserId(null),
              onClick: () => toggleHighlight(s.user.id),
            }}
            strokeOpacity={isHighlighted ? 1 : tierOpacity(finalRank, totalUsers)}
            isAnimationActive={false}
            connectNulls
          />
        )
      })}
    </LineChart>
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        <div className="card overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 16 }}>
              <span
                className="text-[10px] font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Pozycja
              </span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div style={{ minWidth: chartWidth }}>
                <ResponsiveContainer width="100%" height={MOBILE_CHART_HEIGHT}>
                  {chart}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[10px] font-medium text-muted">Numer meczu</p>
        </div>

        {/* Collapsible legend */}
        <div className="card mt-3 overflow-hidden">
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
          >
            <span>
              <i className="fas fa-list mr-2 text-muted" aria-hidden="true" />
              Gracze
              {highlightedIds.size > 0 && (
                <span className="ml-2 text-xs font-normal text-brand">
                  (zaznaczono: {highlightedIds.size})
                </span>
              )}
            </span>
            <i className={`fas fa-chevron-${legendOpen ? 'up' : 'down'} text-muted`} aria-hidden="true" />
          </button>
          {legendOpen && (
            <div className="border-t border-line">
              <Legend
                sortedSeries={sortedSeries}
                colorMap={colorMap}
                highlightedIds={highlightedIds}
                meId={me?.id}
                onToggle={toggleHighlight}
                onClear={clearHighlight}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div className="card min-w-0 flex-1 overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 20 }}>
              <span
                className="text-xs font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Pozycja w rankingu
              </span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div style={{ minWidth: chartWidth }}>
                <ResponsiveContainer width="100%" height={desktopChartHeight}>
                  {chart}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-xs font-medium text-muted">Numer meczu</p>
        </div>

        <div className="card w-44 shrink-0 overflow-hidden">
          <Legend
            sortedSeries={sortedSeries}
            colorMap={colorMap}
            highlightedIds={highlightedIds}
            meId={me?.id}
            onToggle={toggleHighlight}
            onClear={clearHighlight}
            maxHeight={desktopChartHeight}
          />
        </div>
      </div>
    </>
  )
}
