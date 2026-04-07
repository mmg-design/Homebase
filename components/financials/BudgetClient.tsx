'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatMonth, formatCurrencyFull, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, GripVertical } from 'lucide-react'

type Company    = { id: number; name: string; slug: string; is_recurring: boolean }
type RevenueRow = { company_id: number; month: string; budget: number | null; actual: number | null }
type CogsRow    = { company_id: number; month: string; cost: number; contractor_name: string | null; hours?: number; rate?: number }
type ExpenseRow  = { vendor_name: string; month: string; actual_amount: number; planned_amount: number; category: string }
type LineItemRow = { vendor_name: string; month: string; merchant: string; amount: number }
type Goal        = { revenue_goal: number; revenue_stretch_goal: number } | null

interface Props {
  year: number; months: string[]
  companies: Company[]; revenue: RevenueRow[]; cogs: CogsRow[]
  expenses: ExpenseRow[]; lineItems: LineItemRow[]; goal: Goal; contractors: any[]
}

type Filter = 'all' | 'revenue' | 'cogs' | 'opex'

function fmtK(n: number) {
  if (n === 0) return '$0'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}
function fmtPct(n: number) { return `${Math.round(n)}%` }

export function BudgetClient({ year, months, companies: initialCompanies, revenue, cogs, expenses, lineItems, goal }: Props) {
  const router                        = useRouter()
  const [filter, setFilter]           = useState<Filter>('all')
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [cellValues, setCellValues]   = useState<Record<string, number>>({})
  const [saving, setSaving]           = useState<string | null>(null)
  const [savedToast, setSavedToast]   = useState<'saved' | 'error' | null>(null)
  const [opexTooltip, setOpexTooltip] = useState<{ key: string; x: number; y: number } | null>(null)
  const [companies, setCompanies]     = useState(initialCompanies)
  const dragItem                      = useRef<number | null>(null)
  const dragOver                      = useRef<number | null>(null)
  const toastTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── data maps ──────────────────────────────────────────────────────────────
  const revMap: Record<string, number> = {}
  for (const r of revenue) {
    const key = `${r.company_id}-${r.month}`
    revMap[key] = (revMap[key] || 0) + Number(r.actual ?? r.budget ?? 0)
  }

  // Merge DB values with any locally-edited cell values so totals stay in sync
  const effectiveRevMap: Record<string, number> = { ...revMap }
  for (const [k, v] of Object.entries(cellValues)) {
    effectiveRevMap[k] = v
  }

  const cogsMap: Record<string, number> = {}
  const cogsDetailMap: Record<string, Array<{ name: string; hours: number; rate: number; cost: number }>> = {}
  for (const c of cogs) {
    const key = `${c.company_id}-${c.month}`
    cogsMap[key] = (cogsMap[key] || 0) + Number(c.cost)
    if (!cogsDetailMap[key]) cogsDetailMap[key] = []
    cogsDetailMap[key].push({
      name: c.contractor_name || 'Unknown',
      hours: Number(c.hours ?? 0),
      rate: Number(c.rate ?? 0),
      cost: Number(c.cost),
    })
  }

  // expense maps keyed by category
  const expMap: Record<string, number> = {}
  for (const e of expenses) {
    const cat = e.category || e.vendor_name
    const key = `${cat}||${e.month}`
    expMap[key] = (expMap[key] || 0) + Number(e.actual_amount ?? e.planned_amount ?? 0)
  }

  // line item detail map for hover: `${category}||${month}` → [{merchant, amount}]
  const lineItemMap: Record<string, Array<{ merchant: string; amount: number }>> = {}
  for (const li of lineItems) {
    const key = `${li.vendor_name}||${li.month}`
    if (!lineItemMap[key]) lineItemMap[key] = []
    lineItemMap[key].push({ merchant: li.merchant, amount: Number(li.amount) })
  }

  // ── monthly totals ─────────────────────────────────────────────────────────
  const monthlyRevenue = months.map(m =>
    companies.reduce((s, c) => s + (effectiveRevMap[`${c.id}-${m}`] || 0), 0)
  )
  const monthlyCogs = months.map(m =>
    companies.reduce((s, c) => s + (cogsMap[`${c.id}-${m}`] || 0), 0)
  )
  const uniqueCategories = [...new Set(expenses.map(e => e.category || e.vendor_name))].sort()
  const monthlyOpex = months.map(m =>
    uniqueCategories.reduce((s, cat) => s + (expMap[`${cat}||${m}`] || 0), 0)
  )
  const monthlyGP  = months.map((_, i) => monthlyRevenue[i] - monthlyCogs[i])
  const monthlyNet = months.map((_, i) => monthlyGP[i] - monthlyOpex[i])

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const totalCogs    = monthlyCogs.reduce((a, b) => a + b, 0)
  const totalOpex    = monthlyOpex.reduce((a, b) => a + b, 0)
  const totalGP      = totalRevenue - totalCogs
  const totalNet     = totalGP - totalOpex
  const gmPct        = totalRevenue > 0 ? (totalGP / totalRevenue) * 100 : 0
  const goalPct      = goal ? Math.min(100, (totalRevenue / goal.revenue_goal) * 100) : null

  // ── sections visibility ────────────────────────────────────────────────────
  const showRevenue = filter === 'all' || filter === 'revenue'
  const showCogs    = filter === 'all' || filter === 'cogs'
  const showOpex    = filter === 'all' || filter === 'opex'

  // ── save cell ──────────────────────────────────────────────────────────────
  const saveCell = useCallback(async (companyId: number, month: string, value: number) => {
    const key = `${companyId}-${month}`
    setSaving(key)
    try {
      const res = await fetch('/api/financials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, month, category: 'revenue', actual: value }),
      })
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (res.ok) {
        setSavedToast('saved')
        router.refresh()
      } else {
        setSavedToast('error')
      }
      toastTimer.current = setTimeout(() => setSavedToast(null), 2500)
    } catch {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setSavedToast('error')
      toastTimer.current = setTimeout(() => setSavedToast(null), 2500)
    } finally {
      setSaving(null)
    }
  }, [router])

  // ── section header row ────────────────────────────────────────────────────
  const SectionHeader = ({ label, color }: { label: string; color: string }) => (
    <tr>
      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2 font-semibold text-[11px] uppercase tracking-widest" style={{ color }}>
        {label}
      </td>
      {months.map(m => <td key={m} className="bg-gray-50" />)}
      <td className="bg-gray-50" />
    </tr>
  )

  // ── total row ─────────────────────────────────────────────────────────────
  const TotalRow = ({
    label, values, total, color, bg, subValues, bold,
  }: {
    label: string; values: number[]; total: number
    color: string; bg: string; subValues?: number[]; bold?: boolean
  }) => (
    <tr className={cn(bg, bold && 'border-t-2 border-gray-200')}>
      <td className={cn('sticky left-0 z-10 px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold', bg, color)}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={cn('px-2 py-2.5 text-center text-xs font-medium', color)}>
          {fmtK(v)}
          {subValues && subValues[i] !== 0 && (
            <span className="block text-[9px] opacity-60">{fmtPct((v / subValues[i]) * 100)}</span>
          )}
        </td>
      ))}
      <td className={cn('px-3 py-2.5 text-right text-xs font-semibold', color)}>{fmtK(total)}</td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-[var(--background)] py-6 px-4">
      {/* ── OpEx line-item tooltip ── */}
      {opexTooltip && lineItemMap[opexTooltip.key] && (() => {
        const items = lineItemMap[opexTooltip.key]
        const total = items.reduce((s, i) => s + i.amount, 0)
        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: opexTooltip.x, top: opexTooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          >
            <div className="bg-[#1e293b] text-white rounded-xl shadow-2xl py-2.5 min-w-[200px] max-w-[280px]">
              <div className="px-3 pb-2 mb-1 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Line Items</span>
                <span className="text-[11px] font-semibold text-white">{formatCurrencyFull(total)}</span>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1 gap-4">
                    <span className="text-[11px] text-white/80 truncate">{item.merchant}</span>
                    <span className="text-[11px] font-medium text-white shrink-0">
                      {item.amount < 0 ? '-' : ''}{formatCurrencyFull(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
              style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1e293b' }} />
          </div>
        )
      })()}

      {/* ── Saved / Error toast ── */}
      <div className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all duration-300',
        savedToast === 'saved' ? 'bg-[var(--deep-teal)]' : 'bg-red-500',
        savedToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}>
        {savedToast === 'saved' ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
        {savedToast === 'saved' ? 'Saved' : 'Save failed'}
      </div>

      <div className="max-w-7xl mx-auto">

        {/* ── Hero header ── */}
        <div className="rounded-2xl mb-4 overflow-hidden" style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #0c3d52 50%, #0a4a4a 100%)',
          boxShadow: '0 8px 32px rgba(10,37,64,0.28), 0 2px 8px rgba(0,0,0,0.12)',
        }}>
          {/* Top strip: title + controls */}
          <div className="flex items-center justify-between px-8 pt-7 pb-0 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-3xl text-white tracking-tight">MMG Master</h1>
                <span className="text-xs font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                  {year}
                </span>
              </div>
              {/* Stat chips */}
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'Revenue', value: formatCurrencyFull(totalRevenue) },
                  { label: 'Gross Margin', value: fmtPct(gmPct) },
                  { label: 'Net', value: fmtK(totalNet) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                    <div className="text-sm font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Year switcher + filter */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                {[year - 1, year, year + 1].map(y => (
                  <a key={y} href={`/budget?year=${y}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={y === year
                      ? { background: 'rgba(255,255,255,0.18)', color: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }
                    }>
                    {y}
                  </a>
                ))}
              </div>
              <div className="flex gap-1">
                {(['all', 'revenue', 'cogs'] as Filter[]).map(f => (
                  <button key={f}
                    onClick={() => setFilter(f)}
                    className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                    style={filter === f
                      ? { background: 'rgba(255,255,255,0.18)', color: '#ffffff' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }
                    }>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue goal section */}
          {goal && goalPct !== null && (() => {
            const remaining = Math.max(0, goal.revenue_goal - totalRevenue)
            const stretchPct = goal.revenue_stretch_goal > 0
              ? Math.min(100, (totalRevenue / goal.revenue_stretch_goal) * 100)
              : null
            return (
              <div className="px-8 pt-6 pb-7">
                {/* Label row */}
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Revenue Goal
                    </span>
                    {stretchPct !== null && (
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        · stretch {fmtPct(stretchPct)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    {remaining > 0 && (
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {formatCurrencyFull(remaining)} to go
                      </span>
                    )}
                    <span className="font-heading text-4xl font-bold leading-none"
                      style={{ color: goalPct >= 100 ? '#4ade80' : goalPct >= 75 ? '#34d399' : goalPct >= 50 ? '#2dd4bf' : '#22d3ee' }}>
                      {fmtPct(goalPct)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative w-full rounded-full overflow-hidden" style={{ height: 18, background: 'rgba(255,255,255,0.08)' }}>
                  {/* Fill */}
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${goalPct}%`,
                      background: goalPct >= 100
                        ? 'linear-gradient(90deg, #059669, #34d399)'
                        : 'linear-gradient(90deg, #0891b2, #06b6d4, #2dd4bf)',
                      boxShadow: '0 0 16px rgba(6,182,212,0.5), 0 0 4px rgba(6,182,212,0.8)',
                    }}
                  />
                  {/* Milestone ticks */}
                  {[25, 50, 75].map(pct => (
                    <div key={pct} className="absolute inset-y-0 w-px" style={{
                      left: `${pct}%`,
                      background: 'rgba(255,255,255,0.2)',
                    }} />
                  ))}
                </div>

                {/* Scale labels */}
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {formatCurrencyFull(totalRevenue)}
                  </span>
                  {[25, 50, 75].map(pct => (
                    <span key={pct} className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {formatCurrencyFull(goal.revenue_goal * pct / 100)}
                    </span>
                  ))}
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {formatCurrencyFull(goal.revenue_goal)}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Main grid card ── */}
        <div className="bg-white rounded-2xl shadow-md border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm w-full budget-table">
              {/* Column headers */}
              <thead className="sticky top-0 z-20">
                <tr className="bg-[var(--dark-navy)] text-white">
                  <th className="sticky left-0 z-30 bg-[var(--dark-navy)] text-left px-4 py-3 text-xs font-medium w-48 min-w-[180px]">
                    Client / Line Item
                  </th>
                  {months.map(m => (
                    <th key={m} className="px-2 py-3 text-center text-xs font-medium min-w-[78px]">
                      {formatMonth(m)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-medium min-w-[88px]">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">

                {/* ══ REVENUE ══ */}
                {showRevenue && (
                  <>
                    <SectionHeader label="Revenue" color="var(--deep-teal)" />

                    {companies.map((company, idx) => {
                      const rowTotal = months.reduce((s, m) => s + (effectiveRevMap[`${company.id}-${m}`] || 0), 0)
                      return (
                        <tr
                          key={company.id}
                          draggable
                          onDragStart={() => { dragItem.current = idx }}
                          onDragEnter={() => { dragOver.current = idx }}
                          onDragEnd={() => {
                            if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return
                            const next = [...companies]
                            const [moved] = next.splice(dragItem.current, 1)
                            next.splice(dragOver.current, 0, moved)
                            setCompanies(next)
                            dragItem.current = null
                            dragOver.current = null
                          }}
                          onDragOver={e => e.preventDefault()}
                          className="hover:bg-[var(--light-mint)]/40 group cursor-grab active:cursor-grabbing active:opacity-60 active:bg-[var(--light-mint)]/60"
                        >
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[var(--light-mint)]/40 px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <GripVertical size={12} className="text-[var(--border)] shrink-0 group-hover:text-[var(--muted-foreground)]" />
                              <span className="truncate text-[var(--foreground)] text-sm">{company.name}</span>
                              {company.is_recurring && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--light-mint)] text-[var(--bright-teal)] font-semibold uppercase tracking-wide">rec</span>
                              )}
                            </div>
                          </td>
                          {months.map(m => {
                            const key = `${company.id}-${m}`
                            const val = effectiveRevMap[key] || 0
                            const isEditing = editingCell === key
                            return (
                              <td key={m} className="px-1 py-1 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    className="w-[68px] px-1 py-0.5 text-xs text-center border border-[var(--bright-teal)] rounded outline-none bg-white"
                                    defaultValue={val || ''}
                                    autoFocus
                                    onBlur={async (e) => {
                                      const v = parseFloat(e.target.value) || 0
                                      setCellValues(p => ({ ...p, [key]: v }))
                                      setEditingCell(null)
                                      await saveCell(company.id, m, v)
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                      if (e.key === 'Escape') setEditingCell(null)
                                    }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingCell(key)}
                                    className={cn(
                                      'w-full px-1 py-0.5 rounded text-xs transition-colors',
                                      val > 0 ? 'text-[var(--foreground)]' : 'text-[var(--border)]',
                                      saving === key ? 'opacity-40' : 'hover:bg-[var(--bright-teal)]/10'
                                    )}
                                  >
                                    {val > 0 ? fmtK(val) : '+'}
                                  </button>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-right text-xs font-semibold text-[var(--deep-teal)]">
                            {rowTotal > 0 ? fmtK(rowTotal) : '—'}
                          </td>
                        </tr>
                      )
                    })}

                    <TotalRow
                      label="Total Revenue"
                      values={monthlyRevenue}
                      total={totalRevenue}
                      color="text-[var(--deep-teal)]"
                      bg="bg-[var(--light-mint)]"
                    />
                  </>
                )}

                {/* ══ COGS ══ */}
                {showCogs && (
                  <>
                    <SectionHeader label="Labor (COGS)" color="#b45309" />

                    {companies.filter(c => months.some(m => cogsMap[`${c.id}-${m}`] > 0)).map(company => {
                      const rowTotal = months.reduce((s, m) => s + (cogsMap[`${company.id}-${m}`] || 0), 0)
                      if (rowTotal === 0) return null
                      return (
                        <tr key={company.id} className="hover:bg-orange-50/40 group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-orange-50/40 px-4 py-2 text-[var(--foreground)] text-sm">
                            {company.name}
                          </td>
                          {months.map(m => {
                            const key = `${company.id}-${m}`
                            const val = cogsMap[key] || 0
                            const detail = cogsDetailMap[key]
                            return (
                              <td key={m} className="px-2 py-2 text-center text-xs text-orange-700 relative group">
                                {val > 0 ? fmtK(val) : '—'}
                                {val > 0 && detail && detail.length > 0 && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                    <div className="bg-[var(--dark-navy)] text-white rounded-lg shadow-xl p-3 text-left min-w-[180px] max-w-[220px]">
                                      <p className="text-[10px] uppercase tracking-widest text-[var(--bright-teal)] font-semibold mb-2">Labor Breakdown</p>
                                      {detail.map((d, i) => (
                                        <div key={i} className="flex justify-between items-baseline gap-3 mb-1 last:mb-0">
                                          <span className="text-[11px] text-gray-300 truncate">{d.name}</span>
                                          <span className="text-[11px] font-medium text-white shrink-0">
                                            {d.hours > 0 ? `${d.hours}h × $${d.rate}` : fmtK(d.cost)}
                                          </span>
                                        </div>
                                      ))}
                                      <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
                                        <span className="text-[10px] text-gray-400">Total</span>
                                        <span className="text-[11px] font-semibold text-orange-300">{fmtK(val)}</span>
                                      </div>
                                    </div>
                                    <div className="w-2 h-2 bg-[var(--dark-navy)] rotate-45 mx-auto -mt-1" />
                                  </div>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-right text-xs font-semibold text-orange-700">{fmtK(rowTotal)}</td>
                        </tr>
                      )
                    })}

                    {companies.filter(c => months.some(m => cogsMap[`${c.id}-${m}`] > 0)).length === 0 && (
                      <tr>
                        <td colSpan={months.length + 2} className="px-4 py-4 text-xs text-center text-[var(--muted-foreground)]">
                          No labor costs recorded yet — add hours in the Clients tab.
                        </td>
                      </tr>
                    )}

                    <TotalRow
                      label="Total Labor"
                      values={monthlyCogs}
                      total={totalCogs}
                      color="text-orange-700"
                      bg="bg-orange-50"
                    />

                    <TotalRow
                      label="Gross Profit"
                      values={monthlyGP}
                      total={totalGP}
                      color={totalGP >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-500'}
                      bg="bg-[var(--bright-teal)]/10"
                      subValues={monthlyRevenue}
                      bold
                    />
                  </>
                )}

                {/* ══ OPEX ══ */}
                {showOpex && (
                  <>
                    <SectionHeader label="Operating Expenses" color="#7c3aed" />

                    {uniqueCategories.map(cat => {
                      const rowTotal = months.reduce((s, m) => s + (expMap[`${cat}||${m}`] || 0), 0)
                      return (
                        <tr key={cat} className="hover:bg-purple-50/40 group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-purple-50/40 px-4 py-2 text-xs text-[var(--foreground)]">
                            {cat}
                          </td>
                          {months.map(m => {
                            const val = expMap[`${cat}||${m}`] || 0
                            const tooltipKey = `${cat}||${m}`
                            const hasDetail = lineItemMap[tooltipKey]?.length > 0
                            return (
                              <td key={m} className="px-2 py-2 text-center text-xs text-purple-700 relative">
                                <span
                                  className={cn(hasDetail && 'cursor-default underline decoration-dotted decoration-purple-300')}
                                  onMouseEnter={e => {
                                    if (!hasDetail) return
                                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                                    setOpexTooltip({ key: tooltipKey, x: rect.left + rect.width / 2, y: rect.top })
                                  }}
                                  onMouseLeave={() => setOpexTooltip(null)}
                                >
                                  {val > 0 ? fmtK(val) : '—'}
                                </span>
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-right text-xs font-semibold text-purple-700">
                            {rowTotal > 0 ? fmtK(rowTotal) : '—'}
                          </td>
                        </tr>
                      )
                    })}

                    {uniqueCategories.length === 0 && (
                      <tr>
                        <td colSpan={months.length + 2} className="px-4 py-4 text-xs text-center text-[var(--muted-foreground)]">
                          No expenses yet — upload a Monarch Money CSV on the Upload tab.
                        </td>
                      </tr>
                    )}

                    <TotalRow
                      label="Total OpEx"
                      values={monthlyOpex}
                      total={totalOpex}
                      color="text-purple-700"
                      bg="bg-purple-50"
                    />
                  </>
                )}

                {/* OpEx line-item tooltip */}
                {opexTooltip && lineItemMap[opexTooltip.key] && (
                  <tr style={{ display: 'none' }} />
                )}

                {/* ══ NET INCOME ══ */}
                {filter === 'all' && (
                  <tr className="border-t-2 border-[var(--dark-navy)]">
                    <td className="sticky left-0 z-10 bg-[var(--dark-navy)] text-white px-4 py-3 text-xs font-bold uppercase tracking-wide">
                      Net Income
                    </td>
                    {monthlyNet.map((v, i) => (
                      <td key={i} className={cn('px-2 py-3 text-center text-xs font-bold bg-[var(--dark-navy)]', v >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-400')}>
                        <span className="flex items-center justify-center gap-0.5">
                          {v >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {fmtK(v)}
                        </span>
                      </td>
                    ))}
                    <td className={cn('px-3 py-3 text-right text-sm font-bold bg-[var(--dark-navy)]', totalNet >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-400')}>
                      {fmtK(totalNet)}
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
