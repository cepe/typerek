import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useRankingHistory } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { ErrorBox, Loading } from '@/components/Status'
import { formatDateLong, formattedScore } from '@/lib/format'
import type { RankingHistoryMatch } from '@/api/types'

const COL_PX = 20
const MIN_CHART_HEIGHT = 400
const MAX_X_TICKS = 12

function hslColor(index: number, total: number): string {
  const hue = Math.round((index / Math.max(total, 1)) * 360)
  return `hsl(${hue}, 65%, 48%)`
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

  const entry = hoveredUserId ? payload.find((p) => p.dataKey === hoveredUserId) : null
  return (
    <div className="card card-body w-48 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">
        Mecz #{label}: {match.team_a} {score} {match.team_b}
      </p>
      <p className="text-muted">{formatDateLong(match.start)}</p>
      {entry && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
          <span className="w-4 text-right font-bold tabular-nums text-ink">{entry.value}.</span>
          <span className="inline-block h-2 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.stroke }} />
          <span className={`truncate ${entry.dataKey === String(meId) ? 'font-semibold text-brand' : 'text-ink'}`}>
            {userMap.get(entry.dataKey) ?? '—'}
          </span>
        </div>
      )}
    </div>
  )
}

function xTicks(matchCount: number): number[] {
  if (matchCount <= MAX_X_TICKS) return Array.from({ length: matchCount }, (_, i) => i + 1)
  const ticks: number[] = [1]
  const step = (matchCount - 1) / (MAX_X_TICKS - 1)
  for (let i = 1; i < MAX_X_TICKS - 1; i++) ticks.push(Math.round(1 + i * step))
  ticks.push(matchCount)
  return ticks
}

interface Props {
  enabled: boolean
}

export default function RankingBumpChart({ enabled }: Props) {
  const { data, isLoading, isError } = useRankingHistory(enabled)
  const { user: me } = useAuth()
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const { matches, series } = data

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak zakończonych meczów</div>
  }

  const sortedSeries = [...series].sort((a, b) =>
    a.user.username.localeCompare(b.user.username, undefined, { sensitivity: 'base' })
  )
  const colorIndex = new Map(series.map((s, idx) => [s.user.id, idx]))
  const userMap = new Map(series.map((s) => [String(s.user.id), s.user.username]))

  type Row = { x: number } & Record<string, number>
  const rows: Row[] = matches.map((_, i) => {
    const row: Row = { x: i + 1 }
    series.forEach((s) => { row[String(s.user.id)] = s.positions[i] })
    return row
  })

  const totalUsers = series.length
  const chartWidth = Math.max(matches.length * COL_PX, 600)
  const chartHeight = Math.max(MIN_CHART_HEIGHT, totalUsers * 14)
  const yTicks = Array.from({ length: totalUsers }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
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
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart
                  data={rows}
                  margin={{ top: 16, right: 24, bottom: 16, left: 8 }}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[1, matches.length]}
                    ticks={xTicks(matches.length)}
                  />
                  <YAxis
                    reversed
                    domain={[1, totalUsers]}
                    ticks={yTicks}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        matches={matches}
                        userMap={userMap}
                        meId={me?.id}
                        hoveredUserId={hoveredUserId}
                      />
                    }
                  />
                  {series.map((s) => {
                    const uid = String(s.user.id)
                    const idx = colorIndex.get(s.user.id) ?? 0
                    const color = hslColor(idx, totalUsers)
                    const isMe = s.user.id === me?.id
                    const isHighlighted = highlightedId === s.user.id
                    const isDimmed = highlightedId !== null && !isHighlighted && !isMe

                    return (
                      <Line
                        key={uid}
                        dataKey={uid}
                        stroke={color}
                        strokeWidth={isMe || isHighlighted ? 2.5 : 1.5}
                        dot={false}
                        activeDot={{
                          r: 4,
                          onMouseEnter: () => setHoveredUserId(uid),
                          onMouseLeave: () => setHoveredUserId(null),
                        }}
                        strokeOpacity={isDimmed ? 0.1 : 1}
                        isAnimationActive={false}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="mt-1 text-center text-xs font-medium text-muted">Numer meczu</p>
      </div>

      <div className="card shrink-0 overflow-y-auto lg:w-44" style={{ maxHeight: chartHeight }}>
        <ul className="divide-y divide-line/60">
          {sortedSeries.map((s) => {
            const idx = colorIndex.get(s.user.id) ?? 0
            const color = hslColor(idx, totalUsers)
            const isMe = s.user.id === me?.id
            const isHighlighted = highlightedId === s.user.id

            return (
              <li key={s.user.id}>
                <button
                  type="button"
                  onClick={() => setHighlightedId(isHighlighted ? null : s.user.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                    isHighlighted ? 'bg-surface font-semibold' : ''
                  }`}
                >
                  <span className="inline-block h-2.5 w-4 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  <span className={`truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
                    {s.user.username}
                    {isMe && <span className="ml-1 text-[10px] font-normal">(Ty)</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
