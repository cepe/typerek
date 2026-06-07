import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useRankingHistory } from '@/api/hooks'
import { formatDateLong, formattedScore } from '@/lib/format'
import type { RankingHistoryMatch } from '@/api/types'

const COL_PX = 16
const CHART_HEIGHT = 180
const MAX_X_TICKS = 10

function xTicks(count: number): number[] {
  if (count <= MAX_X_TICKS) return Array.from({ length: count }, (_, i) => i + 1)
  const ticks: number[] = [1]
  const step = (count - 1) / (MAX_X_TICKS - 1)
  for (let i = 1; i < MAX_X_TICKS - 1; i++) ticks.push(Math.round(1 + i * step))
  ticks.push(count)
  return ticks
}

interface TooltipProps {
  active?: boolean
  label?: number
  payload?: { value: number }[]
  matches: RankingHistoryMatch[]
  totalUsers: number
}

function ChartTooltip({ active, label, payload, matches, totalUsers }: TooltipProps) {
  if (!active || label == null || !payload?.length) return null
  const match = matches[label - 1]
  if (!match) return null

  const position = payload[0]?.value
  const score =
    match.result_a != null && match.result_b != null
      ? formattedScore(match.result_a, match.result_b)
      : '–:–'

  return (
    <div className="card card-body py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">
        Mecz #{label}: {match.team_a} {score} {match.team_b}
      </p>
      <p className="text-muted">{formatDateLong(match.start)}</p>
      {position != null && (
        <p className="mt-1.5 font-bold text-brand">
          {position}. miejsce <span className="font-normal text-muted">/ {totalUsers}</span>
        </p>
      )}
    </div>
  )
}

interface Props {
  userId: number
}

export default function UserPositionChart({ userId }: Props) {
  const { data, isLoading } = useRankingHistory(true)

  if (isLoading || !data) return null

  const { matches, series } = data
  const userSeries = series.find((s) => s.user.id === userId)

  if (!userSeries || matches.length === 0) return null

  const totalUsers = series.length
  const chartWidth = Math.max(matches.length * COL_PX, 300)
  const yTicks = Array.from({ length: totalUsers }, (_, i) => i + 1)

  const rows = matches.map((_, i) => ({
    x: i + 1,
    position: userSeries.positions[i],
  }))

  // Best and worst positions for reference lines
  const best = Math.min(...userSeries.positions)
  const last = userSeries.positions[userSeries.positions.length - 1]

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="text-sm font-bold text-muted">Historia pozycji w rankingu</h3>
        <span className="text-xs text-muted">
          Aktualna pozycja: <span className="font-semibold text-ink">{last}. / {totalUsers}</span>
        </span>
      </div>
      <div className="px-2 pb-2 pt-1">
        <div className="flex items-stretch gap-1">
          {/* Fixed Y-axis label */}
          <div className="flex shrink-0 items-center justify-center" style={{ width: 14 }}>
            <span
              className="text-[9px] font-medium text-muted"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
            >
              Pozycja
            </span>
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div style={{ minWidth: chartWidth }}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[1, matches.length]}
                    ticks={xTicks(matches.length)}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    reversed
                    domain={[1, totalUsers]}
                    ticks={yTicks}
                    allowDecimals={false}
                    width={24}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<ChartTooltip matches={matches} totalUsers={totalUsers} />} />
                  {/* Reference line for best position */}
                  {best < last && (
                    <ReferenceLine
                      y={best}
                      stroke="var(--color-brand, #12A751)"
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                  )}
                  <Line
                    dataKey="position"
                    stroke="var(--color-brand, #12A751)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="mt-0.5 text-center text-[10px] font-medium text-muted">Numer meczu</p>
      </div>
    </div>
  )
}
