'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutGrid,
  Users,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/budget',          label: 'MMG Master',     icon: LayoutGrid  },
  { href: '/clients',         label: 'Clients',        icon: Users       },
  { href: '/tracker',         label: 'Daily Actions',  icon: CheckSquare },
  { href: '/brand-stats',     label: 'Brand Stats',    icon: BarChart3   },
  { href: '/analysis/annual', label: 'Analysis',       icon: BarChart2   },
  { href: '/settings',        label: 'Settings',       icon: Settings    },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-[var(--border)] transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'flex items-center h-[72px] border-b border-[var(--border)] px-5',
        collapsed ? 'justify-center px-0' : 'justify-start'
      )}>
        {collapsed ? (
          <Image
            src="/MMG-icon.png"
            alt="MMG"
            width={26}
            height={26}
            className="shrink-0"
          />
        ) : (
          <Image
            src="/logodark.png"
            alt="MMG Studio"
            width={116}
            height={26}
            className="object-contain object-left"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-colors',
                active
                  ? 'bg-[var(--sidebar-item-active-bg)]'
                  : 'hover:bg-[var(--sidebar-item-hover-bg)]',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon
                size={19}
                strokeWidth={1.75}
                className={cn('shrink-0', active ? 'text-[var(--deep-teal)]' : 'text-[var(--sidebar-item-rest)]')}
              />
              {!collapsed && (
                <span className={cn(
                  'font-heading text-[15px] leading-none',
                  active ? 'text-[var(--foreground)]' : 'text-[var(--sidebar-item-rest)]'
                )}>
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className={cn('px-3 mb-5', collapsed ? 'flex justify-center' : 'flex justify-start')}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--sidebar-item-rest)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-item-hover-bg)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} strokeWidth={1.75} /> : <ChevronLeft size={14} strokeWidth={1.75} />}
        </button>
      </div>
    </aside>
  )
}
