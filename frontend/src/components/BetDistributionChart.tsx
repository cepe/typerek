import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { BET_TYPES } from '@/lib/bets'
import type { Participant } from '@/api/types'

const COLORS = ['#0E8C43', '#12A751', '#1dbf5f', '#4fd48a', '#86e0b0', '#bcefd4']

interface Props {
  participants: Participant[]
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

export default function BetDistributionChart({ participants }: Props) {
  const data = BET_TYPES.map(([result, label], i) => ({
    label,
    count: participants.filter((p) => p.result === result).length,
    color: COLORS[i],
  })).filter((d) => d.count > 0)

  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="flex items-center gap-6 px-4 py-4 sm:px-5">
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
              <Cell key={entry.label} fill={entry.color} />
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
        {data.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold text-ink">{entry.label}</span>
            <span className="text-muted">— {entry.count} {pluralGraczy(entry.count)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
