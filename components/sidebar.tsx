'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutGrid,
  FileText,
  Users,
  Upload,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/budget',           label: 'Budget',    icon: LayoutGrid },
  { href: '/proposals',        label: 'Proposals', icon: FileText   },
  { href: '/clients',          label: 'Clients',   icon: Users      },
  { href: '/upload',           label: 'Upload',    icon: Upload     },
  { href: '/analysis/annual',  label: 'Analysis',  icon: BarChart2  },
  { href: '/settings',         label: 'Settings',  icon: Settings   },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col bg-[var(--dark-navy)] text-white transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-[var(--sidebar-border)]',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <Image
          src="/MMG-icon.png"
          alt="MMG"
          width={32}
          height={32}
          className="shrink-0"
        />
        {!collapsed && (
          <Image
            src="/logowhite.png"
            alt="MMG Studio"
            width={100}
            height={24}
            className="object-contain"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--bright-teal)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 mx-2 mb-4 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
