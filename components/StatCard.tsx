import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaDirection?: 'up' | 'down' | 'flat'
  hint?: string
  icon?: LucideIcon
  tone?: Tone
  loading?: boolean
}

const toneRing: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = 'flat',
  hint,
  icon: Icon,
  tone = 'default',
  loading = false,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              toneRing[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <span className="inline-block h-7 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <span className="text-[26px] font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </span>
        )}
        {delta && !loading && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
              deltaDirection === 'up' && 'text-emerald-600 dark:text-emerald-400',
              deltaDirection === 'down' && 'text-red-600 dark:text-red-400',
              deltaDirection === 'flat' && 'text-muted-foreground'
            )}
          >
            {deltaDirection === 'up' && '▲'}
            {deltaDirection === 'down' && '▼'}
            {delta}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
