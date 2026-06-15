import { useState } from 'react'
import {
  LineChart, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useRankingHistory } from '@/api/hooks'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/lib/settings'
import { ErrorBox, Loading } from '@/components/Status'
import { formatDateLong, formattedScore, pointsDisplay } from '@/lib/format'
import type { RankingHistoryMatch, RankingHistorySeries } from '@/api/types'

const COL_PX = 20
const MAX_X_TICKS = 12
const MOBILE_CHART_HEIGHT = 320
const DESKTOP_CHART_HEIGHT_PER_USER = 14
const DESKTOP_CHART_MIN_HEIGHT = 500

function tierColor(finalRank: number, total: number): string {
  const frac = finalRank / total
  if (frac <= 0.15) return '#34d399'
  if (frac <= 0.65) return '#6b7280'
  return '#f87171'
}

function tierOpacity(finalRank: number, total: number): number {
  return finalRank / total <= 0.15 ? 0.20 : 0.12
}

function xTicks(matchCount: number): number[] {
  if (matchCount <= MAX_X_TICKS) return Array.from({ length: matchCount }, (_, i) => i + 1)
  const ticks: number[] = [1]
  const step = (matchCount - 1) / (MAX_X_TICKS - 1)
  for (let i = 1; i < MAX_X_TICKS - 1; i++) ticks.push(Math.round(1 + i * step))
  ticks.push(matchCount)
  return ticks
}

function CustomTooltip(_props: {
  active?: boolean
  label?: number
  payload?: unknown[]
  matches: RankingHistoryMatch[]
  series: RankingHistorySeries[]
  userMap: Map<string, string>
  meId?: number
  hoveredUserId: string | null
}) { return null }

interface LegendProps {
  sortedSeries: RankingHistorySeries[]
  finalRankMap: Map<number, number>
  totalUsers: number
  highlightedIds: Set<number>
  favorites: Set<number>
  meId?: number
  onToggle: (id: number) => void
  onClear: () => void
  maxHeight?: number
}
function Legend(_props: LegendProps) { return null }

interface Props {
  enabled: boolean
}

export default function RankingPointsChart({ enabled }: Props) {
  const { data, isLoading, isError } = useRankingHistory(enabled)
  const { user: me } = useAuth()
  const { favoriteUserIds } = useSettings()
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set())
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorBox />

  const { matches, series } = data

  if (matches.length === 0) {
    return <div className="card card-body text-center text-muted">Brak zakończonych meczów</div>
  }

  const favorites = new Set(favoriteUserIds)
  const totalUsers = series.length
  const lastIdx = matches.length - 1
  const rewarded = me?.rewarded_positions ?? 0

  const finalRankMap = new Map(series.map(s => [s.user.id, s.positions[lastIdx] ?? totalUsers]))
  const userMap = new Map(series.map(s => [String(s.user.id), s.user.username]))

  const sortedSeries = [...series].sort((a, b) =>
    a.user.username.localeCompare(b.user.username, undefined, { sensitivity: 'base' })
  )

  type Row = { x: number } & Record<string, number>
  const rows: Row[] = matches.map((_, i) => {
    const row: Row = { x: i + 1 }
    series.forEach(s => { row[String(s.user.id)] = s.points[i] })
    return row
  })

  const globalMax = Math.max(...series.flatMap(s => s.points))

  const inPrize = rewarded > 0
    ? series.filter(s => s.positions[lastIdx] <= rewarded)
    : []
  const prizePoints = inPrize.length > 0
    ? Math.min(...inPrize.map(s => s.points[lastIdx]))
    : null

  const toggleHighlight = (id: number) =>
    setHighlightedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearHighlight = () => setHighlightedIds(new Set())

  const chartWidth = Math.max(matches.length * COL_PX, 600)
  const desktopChartHeight = Math.max(DESKTOP_CHART_MIN_HEIGHT, totalUsers * DESKTOP_CHART_HEIGHT_PER_USER)
  const xDomain: [number, number] = matches.length === 1 ? [0.5, 1.5] : [1, matches.length]

  const chart = (
    <LineChart
      data={rows}
      margin={{ top: 20, right: 40, bottom: 16, left: 8 }}
      onMouseLeave={() => setHoveredUserId(null)}
    >
      <CartesianGrid horizontal vertical={false} strokeDasharray="4 4" stroke="#E4E4E4" />
      <XAxis dataKey="x" type="number" domain={xDomain} ticks={xTicks(matches.length)} />
      <YAxis domain={[0, globalMax]} allowDecimals={false} width={40}
        tickFormatter={(v: number) => pointsDisplay(v)} />
      {prizePoints != null && rewarded > 0 && (
        <ReferenceLine
          y={prizePoints}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: 'strefa nagród', position: 'insideTopLeft', fill: '#b45309', fontSize: 10 }}
        />
      )}
      <Tooltip
        content={
          <CustomTooltip
            matches={matches}
            series={series}
            userMap={userMap}
            meId={me?.id}
            hoveredUserId={hoveredUserId}
          />
        }
      />
      {/* Lines added in Task 3 */}
    </LineChart>
  )

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="card overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 16 }}>
              <span
                className="text-[10px] font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Punkty
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
        <div className="card mt-3 overflow-hidden">
          <button
            type="button"
            onClick={() => setLegendOpen(o => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
          >
            <span>
              <i className="fas fa-list mr-2 text-muted" aria-hidden="true" />
              Gracze
              {highlightedIds.size > 0 && (
                <span className="ml-2 text-xs font-normal text-brand">
                  ({highlightedIds.size} zaznaczonych)
                </span>
              )}
            </span>
            <i className={`fas fa-chevron-${legendOpen ? 'up' : 'down'} text-muted`} aria-hidden="true" />
          </button>
          {legendOpen && (
            <div className="border-t border-line">
              <Legend
                sortedSeries={sortedSeries}
                finalRankMap={finalRankMap}
                totalUsers={totalUsers}
                highlightedIds={highlightedIds}
                favorites={favorites}
                meId={me?.id}
                onToggle={toggleHighlight}
                onClear={clearHighlight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div className="card min-w-0 flex-1 overflow-hidden px-2 pb-2 pt-3">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 20 }}>
              <span
                className="text-xs font-medium text-muted"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Skumulowane punkty
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
        <div className="card w-48 shrink-0 overflow-hidden">
          <Legend
            sortedSeries={sortedSeries}
            finalRankMap={finalRankMap}
            totalUsers={totalUsers}
            highlightedIds={highlightedIds}
            favorites={favorites}
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
