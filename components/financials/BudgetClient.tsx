'use client'
import { useState } from 'react'
import { formatMonth, formatCurrencyFull, cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

type Company    = { id: number; name: string; slug: string; is_recurring: boolean }
type RevenueRow = { company_id: number; month: string; budget: number | null; actual: number | null }
type CogsRow    = { company_id: number; month: string; cost: number; contractor_name: string | null }
type ExpenseRow = { vendor_name: string; month: string; planned_amount: number }
type Goal       = { revenue_goal: number; revenue_stretch_goal: number } | null

interface Props {
  year: number; months: string[]
  companies: Company[]; revenue: RevenueRow[]; cogs: CogsRow[]
  expenses: ExpenseRow[]; goal: Goal; contractors: any[]
}

type Filter = 'all' | 'revenue' | 'cogs' | 'opex'

function fmtK(n: number) {
  if (n === 0) return '$0'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}
function fmtPct(n: number) { return `${Math.round(n)}%` }

export function BudgetClient({ year, months, companies, revenue, cogs, expenses, goal }: Props) {
  const [filter, setFilter]           = useState<Filter>('all')
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [cellValues, setCellValues]   = useState<Record<string, number>>({})
  const [saving, setSaving]           = useState<string | null>(null)

  // ── data maps ──────────────────────────────────────────────────────────────
  const revMap: Record<string, number> = {}
  for (const r of revenue) {
    const key = `${r.company_id}-${r.month}`
    revMap[key] = (revMap[key] || 0) + Number(r.actual ?? r.budget ?? 0)
  }

  const cogsMap: Record<string, number> = {}
  for (const c of cogs) {
    const key = `${c.company_id}-${c.month}`
    cogsMap[key] = (cogsMap[key] || 0) + Number(c.cost)
  }

  const expMap: Record<string, number> = {}
  for (const e of expenses) {
    const key = `${e.vendor_name}-${e.month}`
    expMap[key] = (expMap[key] || 0) + Number(e.planned_amount)
  }

  // ── monthly totals ─────────────────────────────────────────────────────────
  const monthlyRevenue = months.map(m =>
    companies.reduce((s, c) => s + (revMap[`${c.id}-${m}`] || 0), 0)
  )
  const monthlyCogs = months.map(m =>
    companies.reduce((s, c) => s + (cogsMap[`${c.id}-${m}`] || 0), 0)
  )
  const uniqueVendors = [...new Set(expenses.map(e => e.vendor_name))].sort()
  const monthlyOpex = months.map(m =>
    uniqueVendors.reduce((s, v) => s + (expMap[`${v}-${m}`] || 0), 0)
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
  async function saveCell(companyId: number, month: string, value: number) {
    const key = `${companyId}-${month}`
    setSaving(key)
    await fetch('/api/financials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, month, category: 'revenue', line_item: String(companyId), budget: value }),
    })
    setSaving(null)
  }

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
      <div className="max-w-7xl mx-auto">

        {/* ── Top card: goal progress + controls ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] px-6 py-4 mb-4">
          <div className="flex items-start justify-between gap-6 flex-wrap">

            {/* Title + GM */}
            <div>
              <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Budget</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                {year} · {formatCurrencyFull(totalRevenue)} revenue · {fmtPct(gmPct)} GM
              </p>
            </div>

            {/* Goal progress */}
            {goal && goalPct !== null && (
              <div className="flex-1 min-w-[200px] max-w-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-[var(--deep-teal)]">Revenue Goal</p>
                  <p className="text-xs font-semibold text-[var(--bright-teal)]">{fmtPct(goalPct)}</p>
                </div>
                <div className="w-full h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${goalPct}%`,
                      background: goalPct >= 100
                        ? 'var(--bright-teal)'
                        : `linear-gradient(90deg, var(--deep-teal), var(--bright-teal))`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-[10px] text-[var(--muted-foreground)]">{formatCurrencyFull(totalRevenue)}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{formatCurrencyFull(goal.revenue_goal)} goal</p>
                </div>
              </div>
            )}

            {/* Year switcher + filter */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                {[year - 1, year, year + 1].map(y => (
                  <a key={y} href={`/budget?year=${y}`}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                      y === year
                        ? 'bg-[var(--deep-teal)] text-white'
                        : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
                    )}>
                    {y}
                  </a>
                ))}
              </div>
              <div className="flex gap-1">
                {(['all', 'revenue', 'cogs', 'opex'] as Filter[]).map(f => (
                  <button key={f}
                    onClick={() => setFilter(f)}
                    className={cn('px-2.5 py-1 rounded text-[11px] font-medium transition-colors capitalize',
                      filter === f
                        ? 'bg-[var(--deep-teal)] text-white'
                        : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
                    )}>
                    {f === 'all' ? 'All' : f === 'opex' ? 'OpEx' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
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

                    {companies.map(company => {
                      const rowTotal = months.reduce((s, m) => s + (revMap[`${company.id}-${m}`] || 0), 0)
                      return (
                        <tr key={company.id} className="hover:bg-[var(--light-mint)]/40 group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[var(--light-mint)]/40 px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[var(--foreground)] text-sm">{company.name}</span>
                              {company.is_recurring && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--light-mint)] text-[var(--bright-teal)] font-semibold uppercase tracking-wide">rec</span>
                              )}
                            </div>
                          </td>
                          {months.map(m => {
                            const key = `${company.id}-${m}`
                            const val = cellValues[key] !== undefined ? cellValues[key] : (revMap[key] || 0)
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
                            const val = cogsMap[`${company.id}-${m}`] || 0
                            return (
                              <td key={m} className="px-2 py-2 text-center text-xs text-orange-700">
                                {val > 0 ? fmtK(val) : '—'}
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

                    {uniqueVendors.map(vendor => {
                      const rowTotal = months.reduce((s, m) => s + (expMap[`${vendor}-${m}`] || 0), 0)
                      return (
                        <tr key={vendor} className="hover:bg-purple-50/40 group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-purple-50/40 px-4 py-2 text-xs text-[var(--foreground)]">
                            {vendor}
                          </td>
                          {months.map(m => {
                            const val = expMap[`${vendor}-${m}`] || 0
                            return (
                              <td key={m} className="px-2 py-2 text-center text-xs text-purple-700">
                                {val > 0 ? fmtK(val) : '—'}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-right text-xs font-semibold text-purple-700">
                            {rowTotal > 0 ? fmtK(rowTotal) : '—'}
                          </td>
                        </tr>
                      )
                    })}

                    {uniqueVendors.length === 0 && (
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
