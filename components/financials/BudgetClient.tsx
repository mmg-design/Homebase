'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import { cn, formatCurrencyFull, formatMonth } from '@/lib/utils'

type Company = { id: number; name: string; slug: string; is_recurring: boolean; client_category: 'website_seo' | 'brand_deal' | null }
type RevenueRow = { company_id: number; month: string; budget: number | null; actual: number | null }
type Goal = { revenue_goal: number; revenue_stretch_goal: number } | null

interface Props { year: number; months: string[]; companies: Company[]; revenue: RevenueRow[]; goal: Goal }

function fmtK(amount: number) {
  if (amount === 0) return '$0'
  if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${Math.round(amount)}`
}

export function BudgetClient({ year, months, companies: initialCompanies, revenue, goal }: Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState(initialCompanies)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [cellValues, setCellValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<'saved' | 'error' | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const revMap: Record<string, number> = {}
  for (const row of revenue) {
    const key = `${row.company_id}-${row.month}`
    revMap[key] = (revMap[key] || 0) + Number(row.actual ?? row.budget ?? 0)
  }
  const effectiveRevMap = { ...revMap, ...cellValues }
  const monthlyRevenue = months.map(month => companies.reduce((sum, company) => sum + (effectiveRevMap[`${company.id}-${month}`] || 0), 0))
  const totalRevenue = monthlyRevenue.reduce((sum, amount) => sum + amount, 0)
  const goalPct = goal ? Math.min(100, (totalRevenue / goal.revenue_goal) * 100) : null

  const showToast = (type: 'saved' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setSavedToast(type)
    toastTimer.current = setTimeout(() => setSavedToast(null), 2500)
  }
  const saveCell = useCallback(async (companyId: number, month: string, value: number) => {
    const key = `${companyId}-${month}`
    setSaving(key)
    try {
      const response = await fetch('/api/financials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId, month, category: 'revenue', actual: value }) })
      if (response.ok) { showToast('saved'); router.refresh() } else showToast('error')
    } catch { showToast('error') } finally { setSaving(null) }
  }, [router])

  return (
    <div className="min-h-screen bg-[var(--background)] py-6 px-4">
      {savedToast && <div className={cn('fixed right-5 top-5 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg', savedToast === 'saved' ? 'bg-[var(--deep-teal)]' : 'bg-red-600')}>{savedToast === 'saved' ? 'Revenue saved' : 'Could not save revenue'}</div>}
      <div className="max-w-[1500px] mx-auto space-y-4">
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, var(--dark-navy), var(--deep-teal))' }}>
          <div className="flex items-start justify-between gap-6 px-8 pt-7 pb-6"><div><p className="text-xs uppercase tracking-[0.2em] text-white/50 font-medium">MMG Master</p><h1 className="font-heading text-3xl text-white mt-1">Revenue Tracker</h1><p className="text-sm text-white/60 mt-1">Track actual and planned client revenue.</p></div><div className="flex gap-1">{[year - 1, year, year + 1].map(value => <a key={value} href={`/budget?year=${value}`} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={value === year ? { background: 'rgba(255,255,255,0.18)', color: '#fff' } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>{value}</a>)}</div></div>
          <div className="px-8 pb-7 flex items-end justify-between gap-6"><div><p className="text-[11px] uppercase tracking-widest font-semibold text-white/45">Total Revenue</p><p className="font-heading text-4xl font-bold text-white mt-1">{formatCurrencyFull(totalRevenue)}</p></div>{goal && goalPct !== null && <div className="w-full max-w-xl"><div className="flex justify-between mb-2 text-xs"><span className="text-white/55">Revenue goal</span><span className="font-semibold text-white">{Math.round(goalPct)}%</span></div><div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[var(--bright-teal)]" style={{ width: `${goalPct}%` }} /></div><div className="flex justify-between mt-1.5 text-[10px] text-white/50"><span>{formatCurrencyFull(totalRevenue)}</span><span>{formatCurrencyFull(goal.revenue_goal)}</span></div></div>}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="border-collapse text-sm w-full budget-table"><thead><tr className="bg-[var(--dark-navy)] text-white"><th className="sticky left-0 z-30 bg-[var(--dark-navy)] text-left px-4 py-3 text-xs font-medium w-48 min-w-[180px]">Client</th>{months.map(month => <th key={month} className="px-2 py-3 text-center text-xs font-medium min-w-[78px]">{formatMonth(month)}</th>)}<th className="px-3 py-3 text-right text-xs font-medium min-w-[88px]">Total</th></tr></thead><tbody className="divide-y divide-[var(--border)]">
          {companies.map((company, index) => { const rowTotal = months.reduce((sum, month) => sum + (effectiveRevMap[`${company.id}-${month}`] || 0), 0); return <tr key={company.id} draggable onDragStart={() => { dragItem.current = index }} onDragEnter={() => { dragOver.current = index }} onDragEnd={() => { if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return; const next = [...companies]; const [moved] = next.splice(dragItem.current, 1); next.splice(dragOver.current, 0, moved); setCompanies(next); dragItem.current = null; dragOver.current = null }} onDragOver={event => event.preventDefault()} className="hover:bg-[var(--light-mint)]/40 group cursor-grab active:cursor-grabbing"><td className="sticky left-0 z-10 bg-white group-hover:bg-[var(--light-mint)]/40 px-2 py-2"><div className="flex items-center gap-1.5"><GripVertical size={12} className="text-[var(--border)] shrink-0" /><span className="retro-client-name truncate text-[var(--foreground)] text-sm">{company.name}</span>{company.is_recurring && <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--light-mint)] text-[var(--bright-teal)] font-semibold uppercase tracking-wide">rec</span>}{company.client_category && <ClientCategoryBadge category={company.client_category} />}</div></td>{months.map(month => { const key = `${company.id}-${month}`; const value = effectiveRevMap[key] || 0; const isEditing = editingCell === key; return <td key={month} className="px-1 py-1 text-center">{isEditing ? <input type="number" className="w-[68px] px-1 py-0.5 text-xs text-center border border-[var(--bright-teal)] rounded outline-none bg-white" defaultValue={value || ''} autoFocus onBlur={async event => { const next = parseFloat(event.target.value) || 0; setCellValues(current => ({ ...current, [key]: next })); setEditingCell(null); await saveCell(company.id, month, next) }} onKeyDown={event => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); if (event.key === 'Escape') setEditingCell(null) }} /> : <button onClick={() => setEditingCell(key)} className={cn('w-full px-1 py-0.5 rounded text-xs transition-colors', value > 0 ? 'text-[var(--foreground)]' : 'text-[var(--border)]', saving === key ? 'opacity-40' : 'hover:bg-[var(--bright-teal)]/10')}>{value > 0 ? fmtK(value) : '+'}</button>}</td> })}<td className="px-3 py-2 text-right text-xs font-semibold text-[var(--deep-teal)]">{rowTotal > 0 ? fmtK(rowTotal) : '—'}</td></tr> })}
          <tr className="bg-[var(--light-mint)] border-t-2 border-[var(--deep-teal)]"><td className="sticky left-0 z-10 bg-[var(--light-mint)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--deep-teal)]">Total Revenue</td>{monthlyRevenue.map((amount, index) => <td key={index} className="px-2 py-3 text-center text-xs font-bold text-[var(--deep-teal)]">{fmtK(amount)}</td>)}<td className="px-3 py-3 text-right text-sm font-bold text-[var(--deep-teal)]">{fmtK(totalRevenue)}</td></tr>
        </tbody></table></div></div>
      </div>
    </div>
  )
}

function ClientCategoryBadge({ category }: { category: 'website_seo' | 'brand_deal' }) {
  return <span className={category === 'website_seo' ? 'shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold uppercase tracking-wide' : 'shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-semibold uppercase tracking-wide'}>{category === 'website_seo' ? 'Website & SEO' : 'Brand Deal'}</span>
}
