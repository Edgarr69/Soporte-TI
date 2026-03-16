'use client'

import { cn } from '@/lib/utils'

// ─── Area Sparkline (SVG) ─────────────────────────────────────────

interface AreaSparkLineProps {
  data: { label: string; value: number }[]
  className?: string
}

export function AreaSparkLine({ data, className }: AreaSparkLineProps) {
  if (!data.length) {
    return (
      <div className={cn('h-36 flex items-center justify-center text-sm text-zinc-400', className)}>
        Sin datos
      </div>
    )
  }

  const W = 420
  const H = 150
  const PAD = { top: 10, right: 8, bottom: 28, left: 28 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.map((d) => d.value), 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length > 1 ? i / (data.length - 1) : 0.5) * cW,
    y: PAD.top + (1 - d.value / max) * cH,
    label: d.label,
    value: d.value,
  }))

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${pts.at(-1)!.x.toFixed(1)},${(PAD.top + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + cH).toFixed(1)}Z`

  const yMarks = [0, 0.5, 1].map((f) => ({
    y: PAD.top + (1 - f) * cH,
    val: Math.round(f * max),
  }))

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36">
        {yMarks.map(({ y, val }, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={PAD.left + cW}
            y2={y}
            strokeWidth="1"
            strokeDasharray="4 3"
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
        ))}
        {yMarks.map(({ y, val }, i) => (
          <text
            key={`y-${i}`}
            x={PAD.left - 4}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            className="fill-zinc-400"
          >
            {val}
          </text>
        ))}
        <path d={areaPath} className="fill-zinc-900/10 dark:fill-zinc-100/10" />
        <path
          d={linePath}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-zinc-900 dark:stroke-zinc-100"
        />
        {pts.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="3.5"
            strokeWidth="2"
            className="fill-zinc-900 dark:fill-zinc-100 stroke-white dark:stroke-zinc-950"
          />
        ))}
        {pts.map((p) => (
          <text
            key={`xl-${p.label}`}
            x={p.x}
            y={H - 5}
            textAnchor="middle"
            fontSize="10"
            className="fill-zinc-400"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── Vertical Bar Chart ────────────────────────────────────────────

interface VerticalBarChartProps {
  data: { label: string; value: number }[]
  className?: string
}

export function VerticalBarChart({ data, className }: VerticalBarChartProps) {
  if (!data.length) {
    return (
      <div className={cn('h-36 flex items-center justify-center text-sm text-zinc-400', className)}>
        Sin datos
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const BAR_H = 112

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-end gap-1.5" style={{ height: BAR_H }}>
        {data.map((d) => {
          const barH = Math.max((d.value / max) * BAR_H, d.value > 0 ? 8 : 0)
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end min-w-0"
              style={{ height: BAR_H }}
            >
              {d.value > 0 && (
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums mb-0.5">
                  {d.value}
                </span>
              )}
              <div
                className="w-full bg-zinc-900 dark:bg-zinc-100 rounded-t transition-all duration-500"
                style={{ height: barH }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5">
        {data.map((d) => (
          <span
            key={`l-${d.label}`}
            className="flex-1 text-[10px] text-zinc-400 text-center truncate leading-tight"
            title={d.label}
          >
            {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Horizontal Bar List ───────────────────────────────────────────

interface HorizontalBarListProps {
  data: { name: string; count: number }[]
  className?: string
}

export function HorizontalBarList({ data, className }: HorizontalBarListProps) {
  if (!data.length) {
    return (
      <div className={cn('text-sm text-zinc-400 py-4 text-center', className)}>
        Sin datos
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className={cn('space-y-2.5', className)}>
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="text-sm text-zinc-700 dark:text-zinc-300 w-28 truncate shrink-0">
            {d.name}
          </span>
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 min-w-0 overflow-hidden">
            <div
              className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((d.count / max) * 100, d.count > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
          <span className="text-sm font-semibold text-zinc-500 w-6 text-right shrink-0 tabular-nums">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}
