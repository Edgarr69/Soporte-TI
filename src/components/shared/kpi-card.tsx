'use client'

import { Card, CardContent } from '@/components/ui/card'
import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  valueColor?: string
  description?: string
}

export function KpiCard({ label, value, icon, valueColor, description }: KpiCardProps) {
  const colorClass = cn('text-3xl font-bold', valueColor ?? 'text-zinc-900 dark:text-zinc-50')

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
        {typeof value === 'number' ? (
          <NumberTicker value={value} className={colorClass} />
        ) : (
          <p className={colorClass}>{value}</p>
        )}
        {description && (
          <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
