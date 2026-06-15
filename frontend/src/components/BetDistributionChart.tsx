import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { BET_TYPES } from '@/lib/bets'
import type { BetType, Participant } from '@/api/types'

// No result yet — grey scale matching the neutral bet-locked pill style
const GREY_COLORS = ['#5F6A6D', '#7A8587', '#95A0A1', '#B0BBBB', '#C8D0D0', '#DCDFE0']
// Finished match — green for winning bets, red for losing bets
const GREEN_COLORS = ['#0E8C43', '#12A751', '#1dbf5f']
const RED_COLORS = ['#c53030', '#FA6A6A', '#fb9b9b']

interface Props {
  participants: Participant[]
  finished: boolean
  scoredBets: Set<BetType> | null
  selectedResult?: BetType | null
  onSelect?: (result: BetType | null) => void
}

function pluralGraczy(n: number): string {
  return n === 1 ? 'gracz' : 'graczy'
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const count = payload[0].value ?? 0
  return (
    <div className="card card-body py-1.5 text-xs shadow-lg">
      {count} {pluralGraczy(count)}
    </div>
  )
}

export default function BetDistributionChart({ participants, finished, scoredBets, selectedResult = null, onSelect }: Props) {
  let greenIdx = 0, redIdx = 0, greyIdx = 0
  const data = BET_TYPES.map(([result, label]) => ({
    label,
    result,
    count: participants.filter((p) => p.result === result).length,
  })).filter((d) => d.count > 0).map((d) => {
    let color: string
    if (!finished || scoredBets === null) {
      color = GREY_COLORS[greyIdx++ % GREY_COLORS.length]
    } else if (scoredBets.has(d.result)) {
      color = GREEN_COLORS[greenIdx++ % GREEN_COLORS.length]
    } else {
      color = RED_COLORS[redIdx++ % RED_COLORS.length]
    }
    return { ...d, color }
  })

  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)

  function handleToggle(result: BetType) {
    onSelect?.(selectedResult === result ? null : result)
  }

  return (
    <div className="flex items-center justify-center gap-6 px-4 py-4 sm:px-5">
      <div className="relative shrink-0">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx={60}
            cy={60}
            innerRadius={34}
            outerRadius={56}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.color}
                style={{
                  cursor: onSelect ? 'pointer' : 'default',
                  opacity: selectedResult === null || selectedResult === entry.result ? 1 : 0.3,
                  transition: 'opacity 0.15s',
                }}
                onClick={onSelect ? () => handleToggle(entry.result) : undefined}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-ink">{total}</span>
          <span className="text-[10px] text-muted">{pluralGraczy(total)}</span>
        </div>
      </div>

      <ul className="space-y-1 text-xs">
        {data.map((entry) => {
          const isSelected = selectedResult === entry.result
          const isDimmed = selectedResult !== null && !isSelected
          return (
            <li
              key={entry.label}
              className={`flex items-center gap-2 transition-opacity duration-150 ${onSelect ? 'cursor-pointer' : ''} ${isDimmed ? 'opacity-30' : ''}`}
              onClick={onSelect ? () => handleToggle(entry.result) : undefined}
            >
              <span
                className="inline-block h-2.5 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className={`text-ink ${isSelected ? 'font-bold' : 'font-semibold'}`}>{entry.label}</span>
              <span className="text-muted">— {entry.count} {pluralGraczy(entry.count)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
