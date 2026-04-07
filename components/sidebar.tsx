'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutGrid,
  Users,
  Upload,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/budget',          label: 'MMG Master',     icon: LayoutGrid  },
  { href: '/clients',         label: 'Homebase',       icon: Users       },
  { href: '/tracker',         label: 'Daily Actions',  icon: CheckSquare },
  { href: '/upload',          label: 'Upload',         icon: Upload      },
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
        'flex items-center h-16 border-b border-[var(--border)] px-4',
        collapsed ? 'justify-center' : 'justify-start'
      )}>
        {collapsed ? (
          <Image
            src="/MMG-icon.png"
            alt="MMG"
            width={28}
            height={28}
            className="shrink-0"
          />
        ) : (
          <Image
            src="/logodark.png"
            alt="MMG Studio"
            width={120}
            height={28}
            className="object-contain object-left"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--light-mint)] text-[var(--deep-teal)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--light-mint)]/60',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon
                size={18}
                className={cn('shrink-0', active ? 'text-[var(--bright-teal)]' : '')}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className={cn('px-2 mb-4', collapsed ? 'flex justify-center' : 'flex justify-start')}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--light-mint)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  )
}
