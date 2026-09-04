'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function RetroMode() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('mmg-retro-mode') === 'true'
    setEnabled(saved)
    document.documentElement.classList.toggle('retro-mode', saved)
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    window.localStorage.setItem('mmg-retro-mode', String(next))
    document.documentElement.classList.toggle('retro-mode', next)
  }

  return <button onClick={toggle} aria-pressed={enabled} className={enabled ? 'fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[var(--dark-navy)] px-3 py-2 text-xs font-semibold text-white shadow-lg ring-2 ring-[var(--bright-teal)] transition-all' : 'fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--deep-teal)] shadow-lg border border-[var(--border)] transition-all hover:border-[var(--bright-teal)]'}>{enabled ? <EyeOff size={14} /> : <Eye size={14} />}<span>Retro Mode</span><span className={enabled ? 'h-4 w-7 rounded-full bg-[var(--bright-teal)] p-0.5' : 'h-4 w-7 rounded-full bg-slate-200 p-0.5'}><span className={enabled ? 'block h-3 w-3 translate-x-3 rounded-full bg-white transition-transform' : 'block h-3 w-3 rounded-full bg-white shadow-sm transition-transform'} /></span></button>
}
