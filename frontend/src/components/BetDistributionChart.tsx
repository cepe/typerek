import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { BET_TYPES } from '@/lib/bets'
import type { Participant } from '@/api/types'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#e0e7ff']

interface Props {
  participants: Participant[]
}

interface TooltipPayload {
  name: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: TooltipPayload }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { value } = payload[0].payload
  return (
    <div className="card card-body py-1.5 text-xs shadow-lg">
      {value} {value === 1 ? 'gracz' : 'graczy'}
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
          <span className="text-[10px] text-muted">graczy</span>
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
            <span className="text-muted">— {entry.count} {entry.count === 1 ? 'gracz' : 'graczy'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
