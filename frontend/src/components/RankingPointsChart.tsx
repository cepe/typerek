import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
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

function getLineProps(
  s: RankingHistorySeries,
  meId: number | undefined,
  favorites: Set<number>,
  highlightedIds: Set<number>,
  finalRankMap: Map<number, number>,
  totalUsers: number,
): { stroke: string; strokeWidth: number; strokeOpacity: number } {
  const uid = s.user.id
  const finalRank = finalRankMap.get(uid) ?? totalUsers
  const anyHighlighted = highlightedIds.size > 0

  if (uid === meId)             return { stroke: '#12A751', strokeWidth: 2.5, strokeOpacity: 1 }
  if (favorites.has(uid))       return { stroke: '#f59e0b', strokeWidth: 1.8, strokeOpacity: 1 }
  if (highlightedIds.has(uid))  return { stroke: tierColor(finalRank, totalUsers), strokeWidth: 2,   strokeOpacity: 1 }
  if (anyHighlighted)           return { stroke: tierColor(finalRank, totalUsers), strokeWidth: 1,   strokeOpacity: 0.05 }
  return                               { stroke: tierColor(finalRank, totalUsers), strokeWidth: 1,   strokeOpacity: tierOpacity(finalRank, totalUsers) }
}

interface EndDotProps { cx?: number; cy?: number; index?: number }

function makeEndDot(rank: number, color: string, lastMatchIdx: number) {
  return function EndDot({ cx, cy, index }: EndDotProps) {
    if (cx == null || cy == null || index !== lastMatchIdx) return null
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={color} />
        <text x={cx + 5} y={cy + 4} fontSize={9} fill={color} fontWeight={700}>{`#${rank}`}</text>
      </g>
    )
  }
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
  series: RankingHistorySeries[]
  userMap: Map<string, string>
  meId?: number
  hoveredUserId: string | null
}

function CustomTooltip({ active, label, payload, matches, series, userMap, meId, hoveredUserId }: CustomTooltipProps) {
  if (!active || label == null || !payload?.length) return null
  const matchIdx = label - 1
  const match = matches[matchIdx]
  if (!match) return null
  const score =
    match.result_a != null && match.result_b != null
      ? formattedScore(match.result_a, match.result_b)
      : '–:–'

  const hoveredEntry = hoveredUserId ? payload.find(p => p.dataKey === hoveredUserId) : null
  if (!hoveredEntry) return null

  const uid = parseInt(hoveredEntry.dataKey, 10)
  if (!Number.isFinite(uid)) return null
  const userSeries = series.find(s => s.user.id === uid)
  const pts = userSeries?.points[matchIdx] ?? hoveredEntry.value
  const pos = userSeries?.positions[matchIdx] ?? null
  const isMe = hoveredEntry.dataKey === String(meId)

  return (
    <div className="card card-body w-52 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">
        Mecz #{label}: {match.team_a} {score} {match.team_b}
      </p>
      <p className="text-muted">{formatDateLong(match.start)}</p>
      <div className="mt-2 border-t border-line pt-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: hoveredEntry.stroke }}
          />
          <span className={`truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
            {userMap.get(hoveredEntry.dataKey) ?? '—'}
          </span>
        </div>
        <p className="mt-1 font-bold text-ink tabular-nums">
          {pointsDisplay(pts)} pkt
          {pos != null && (
            <span className="ml-2 text-xs font-normal text-muted">({pos}. miejsce)</span>
          )}
        </p>
      </div>
    </div>
  )
}

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
function Legend({ sortedSeries, finalRankMap, totalUsers, highlightedIds, favorites, meId, onToggle, onClear, maxHeight }: LegendProps) {
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
      <ul
        className="divide-y divide-line/60"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {sortedSeries.map(s => {
          const uid = s.user.id
          const finalRank = finalRankMap.get(uid) ?? totalUsers
          const isMe = uid === meId
          const isFav = favorites.has(uid)
          const isSelected = highlightedIds.has(uid)
          const lineColor = isMe ? '#12A751' : isFav ? '#f59e0b' : tierColor(finalRank, totalUsers)

          return (
            <li key={uid}>
              <button
                type="button"
                onClick={() => onToggle(uid)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  isSelected ? 'bg-surface font-semibold' : ''
                }`}
              >
                <span
                  className="inline-block h-2.5 w-4 shrink-0 rounded-sm"
                  style={{ backgroundColor: lineColor, opacity: isSelected || isMe || isFav ? 1 : 0.5 }}
                />
                <span className={`flex-1 truncate ${isMe ? 'font-semibold text-brand' : 'text-ink'}`}>
                  {s.user.username}
                  {isMe && <span className="ml-1 text-[10px] font-normal">(Ty)</span>}
                  {isFav && !isMe && <span className="ml-1 text-yellow-500">★</span>}
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

  const globalMax = series.length > 0 ? Math.max(...series.flatMap(s => s.points)) : 100

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

  const sortedForRender = [...series].sort((a, b) => {
    const rank = (s: RankingHistorySeries) => {
      if (s.user.id === me?.id)          return 3
      if (favorites.has(s.user.id))      return 2
      if (highlightedIds.has(s.user.id)) return 1
      return 0
    }
    return rank(a) - rank(b)
  })

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
      {sortedForRender.map(s => {
          const uid = String(s.user.id)
          const props = getLineProps(s, me?.id, favorites, highlightedIds, finalRankMap, totalUsers)
          const finalRank = finalRankMap.get(s.user.id) ?? totalUsers
          const showEndLabel = finalRank <= 3 && s.user.id !== me?.id && !favorites.has(s.user.id)

          return (
            // recharts dot type expects ReactElement; function components returning null need this cast
            <Line
              key={uid}
              dataKey={uid}
              stroke={props.stroke}
              strokeWidth={props.strokeWidth}
              strokeOpacity={props.strokeOpacity}
              dot={showEndLabel ? makeEndDot(finalRank, props.stroke, lastIdx) as unknown as React.ReactElement : false}
              activeDot={{
                r: 4,
                onMouseEnter: () => setHoveredUserId(uid),
                onMouseLeave: () => setHoveredUserId(null),
              }}
              isAnimationActive={false}
              connectNulls
            />
          )
        })}
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
