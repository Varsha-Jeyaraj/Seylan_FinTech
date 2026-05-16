'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Brain,
  LayoutDashboard,
  Play,
  Shield,
  HelpCircle,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const primaryNav = [
  { name: 'Overview', href: '/', icon: LayoutDashboard, description: 'Real-time pulse' },
  { name: 'AI Intelligence', href: '/intelligence', icon: Brain, description: 'Predictive signals' },
  { name: 'Fraud Operations', href: '/fraud', icon: Shield, description: 'Live monitoring' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Customer insights' },
] as const

const secondaryNav = [
  { name: 'Demo Mode', href: '/demo', icon: Play, badge: 'LIVE' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <span className="text-base font-bold tracking-tight">S</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            Seylan IntelliBank
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">
            Employee Portal · v2.4
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {primaryNav.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                  )}
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground'
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium leading-tight">{item.name}</span>
                    <span className="truncate text-[10.5px] text-sidebar-foreground/45 group-hover:text-sidebar-foreground/65">
                      {item.description}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
          Tools
        </p>
        <ul className="space-y-0.5">
          {secondaryNav.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground'
                    )}
                  />
                  <span className="flex-1 font-medium">{item.name}</span>
                  {item.badge && (
                    <Badge className="h-5 border-0 bg-secondary/90 px-1.5 text-[9px] font-semibold tracking-wider text-secondary-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer: support + profile */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <Link
          href="#"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Help & Support
        </Link>
        <Link
          href="#"
          className="mb-3 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/40 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-semibold text-white">
            NK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              Nadeesha K.
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/55">
              Fraud Analyst · Tier 2
            </p>
          </div>
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-sidebar"
            aria-label="online"
          />
        </div>
      </div>
    </aside>
  )
}
