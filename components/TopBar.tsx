'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ChevronRight, Command } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Overview',
  '/intelligence': 'AI Intelligence',
  '/fraud': 'Fraud Operations',
  '/analytics': 'Analytics',
  '/demo': 'Demo Mode',
  '/crm': 'CRM',
}

function getBreadcrumb(pathname: string) {
  if (pathname === '/') return [{ label: 'Overview', href: '/' }]
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'Workspace', href: '/' }]
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    crumbs.push({
      label: ROUTE_LABELS[acc] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      href: acc,
    })
  }
  return crumbs
}

export function TopBar() {
  const pathname = usePathname()
  const crumbs = getBreadcrumb(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              )}
              <span
                className={
                  isLast
                    ? 'truncate font-semibold text-foreground'
                    : 'truncate text-muted-foreground'
                }
              >
                {crumb.label}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="hidden md:flex">
          <div className="group relative flex h-9 w-72 items-center gap-2 rounded-md border border-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 focus-within:border-ring focus-within:bg-background">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="search"
              placeholder="Search accounts, transactions, alerts…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
              <Command className="h-2.5 w-2.5" />
              K
            </kbd>
          </div>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        </button>

        <ThemeToggle />

        {/* Environment tag */}
        <div className="hidden items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 lg:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Production · LK
        </div>
      </div>
    </header>
  )
}
