'use client'
import { useState, useCallback } from 'react'
import { formatMonth, formatCurrencyFull, cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, TrendingUp, TrendingDown } from 'lucide-react'

type Company = { id: number; name: string; slug: string; is_recurring: boolean }
type RevenueRow = { id: number; company_id: number; company_name: string; slug: string; month: string; budget: number | null; actual: number | null }
type CogsRow = { company_id: number; month: string; cost: number; contractor_name: string | null }
type ExpenseRow = { id: number; vendor_name: string; month: string; planned_amount: number; actual_amount: number; category: string }
type Goal = { revenue_goal: number; revenue_stretch_goal: number } | null
type Contractor = { id: number; name: string; hourly_rate: number }

interface Props {
  year: number
  months: string[]
  companies: Company[]
  revenue: RevenueRow[]
  cogs: CogsRow[]
  expenses: ExpenseRow[]
  goal: Goal
  contractors: Contractor[]
}

function fmtK(n: number) {
  if (n === 0) return '—'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`
}

export function BudgetClient({ year, months, companies, revenue, cogs, expenses, goal, contractors }: Props) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [cellValues, setCellValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // Build revenue lookup: companyId-month -> amount
  const revMap: Record<string, number> = {}
  for (const r of revenue) {
    const key = `${r.company_id}-${r.month}`
    revMap[key] = (revMap[key] || 0) + (r.actual ?? r.budget ?? 0)
  }

  // Build cogs lookup: companyId-month -> total cost
  const cogsMap: Record<string, number> = {}
  for (const c of cogs) {
    const key = `${c.company_id}-${c.month}`
    cogsMap[key] = (cogsMap[key] || 0) + Number(c.cost)
  }

  // Build expense lookup: vendor-month -> planned
  const expMap: Record<string, number> = {}
  for (const e of expenses) {
    const key = `${e.vendor_name}-${e.month}`
    expMap[key] = Number(e.planned_amount)
  }

  // Monthly totals
  const monthlyRevenue = months.map(m =>
    companies.reduce((sum, c) => sum + (revMap[`${c.id}-${m}`] || 0), 0)
  )
  const monthlyCogs = months.map(m =>
    companies.reduce((sum, c) => sum + (cogsMap[`${c.id}-${m}`] || 0), 0)
  )
  const uniqueVendors = [...new Set(expenses.map(e => e.vendor_name))].sort()
  const monthlyOpex = months.map(m =>
    uniqueVendors.reduce((sum, v) => sum + (expMap[`${v}-${m}`] || 0), 0)
  )
  const monthlyGrossProfit = months.map((_, i) => monthlyRevenue[i] - monthlyCogs[i])
  const monthlyNetIncome = months.map((_, i) => monthlyGrossProfit[i] - monthlyOpex[i])

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const totalCogs = monthlyCogs.reduce((a, b) => a + b, 0)
  const totalOpex = monthlyOpex.reduce((a, b) => a + b, 0)
  const totalGP = totalRevenue - totalCogs
  const totalNet = totalGP - totalOpex
  const avgGMPct = totalRevenue > 0 ? (totalGP / totalRevenue) * 100 : 0

  function toggleSection(key: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function saveCell(companyId: number, month: string, value: number) {
    const key = `${companyId}-${month}`
    setSaving(key)
    await fetch('/api/financials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        month,
        category: 'revenue',
        line_item: String(companyId),
        budget: value,
      }),
    })
    setSaving(null)
  }

  const SectionHeader = ({ label, sectionKey, color = 'var(--deep-teal)' }: { label: string; sectionKey: string; color?: string }) => (
    <tr
      className="cursor-pointer select-none hover:bg-black/5"
      onClick={() => toggleSection(sectionKey)}
    >
      <td className="sticky left-0 z-10 bg-[var(--light-mint)] px-4 py-2 font-semibold text-xs uppercase tracking-wider" style={{ color }}>
        <span className="flex items-center gap-1">
          {collapsedSections.has(sectionKey) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {label}
        </span>
      </td>
      {months.map(m => <td key={m} className="bg-[var(--light-mint)]" />)}
      <td className="bg-[var(--light-mint)]" />
    </tr>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white">
        <div>
          <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Budget</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {year} · {formatCurrencyFull(totalRevenue)} revenue · {fmtPct(avgGMPct)} GM
          </p>
        </div>
        <div className="flex items-center gap-3">
          {goal && (
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">Goal</p>
              <p className="text-sm font-semibold text-[var(--deep-teal)]">
                {formatCurrencyFull(goal.revenue_goal)}
              </p>
              <div className="w-32 h-1.5 bg-[var(--border)] rounded-full mt-1">
                <div
                  className="h-full bg-[var(--bright-teal)] rounded-full"
                  style={{ width: `${Math.min(100, (totalRevenue / goal.revenue_goal) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-1">
            {[year - 1, year, year + 1].map(y => (
              <a
                key={y}
                href={`/budget?year=${y}`}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  y === year
                    ? 'bg-[var(--deep-teal)] text-white'
                    : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
                )}
              >
                {y}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-sm w-full budget-table">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--dark-navy)] text-white">
              <th className="sticky left-0 z-30 bg-[var(--dark-navy)] text-left px-4 py-3 font-medium text-xs w-48 min-w-[180px]">
                Client / Line Item
              </th>
              {months.map(m => (
                <th key={m} className="px-2 py-3 text-center font-medium text-xs min-w-[80px]">
                  {formatMonth(m)}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium text-xs min-w-[90px]">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {/* ── REVENUE ── */}
            <SectionHeader label="Revenue" sectionKey="revenue" color="var(--deep-teal)" />

            {!collapsedSections.has('revenue') && companies.map(company => {
              const rowTotal = months.reduce((sum, m) => sum + (revMap[`${company.id}-${m}`] || 0), 0)
              return (
                <tr key={company.id} className="hover:bg-[var(--light-mint)]/50 group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[var(--light-mint)]/50 px-4 py-2">
                    <span className="truncate block max-w-[160px] text-[var(--foreground)]">{company.name}</span>
                    {company.is_recurring && (
                      <span className="text-[10px] text-[var(--bright-teal)] font-medium">recurring</span>
                    )}
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
                            className="w-[72px] px-1 py-0.5 text-xs text-center border border-[var(--bright-teal)] rounded outline-none bg-white"
                            defaultValue={val || ''}
                            autoFocus
                            onBlur={async (e) => {
                              const newVal = parseFloat(e.target.value) || 0
                              setCellValues(prev => ({ ...prev, [key]: newVal }))
                              setEditingCell(null)
                              await saveCell(company.id, m, newVal)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                          />
                        ) : (
                          <button
                            className={cn(
                              'w-full px-1 py-0.5 rounded text-xs transition-colors',
                              val > 0 ? 'text-[var(--foreground)]' : 'text-[var(--border)]',
                              saving === key ? 'opacity-50' : 'hover:bg-[var(--bright-teal)]/10'
                            )}
                            onClick={() => setEditingCell(key)}
                          >
                            {val > 0 ? fmtK(val) : '+'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right text-xs font-medium text-[var(--deep-teal)]">
                    {rowTotal > 0 ? fmtK(rowTotal) : '—'}
                  </td>
                </tr>
              )
            })}

            {/* Revenue total row */}
            <tr className="bg-[var(--light-mint)] font-semibold">
              <td className="sticky left-0 z-10 bg-[var(--light-mint)] px-4 py-2.5 text-xs uppercase tracking-wide text-[var(--deep-teal)]">
                Total Revenue
              </td>
              {monthlyRevenue.map((v, i) => (
                <td key={i} className="px-2 py-2.5 text-center text-xs text-[var(--deep-teal)]">
                  {v > 0 ? fmtK(v) : '—'}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right text-xs text-[var(--deep-teal)]">
                {fmtK(totalRevenue)}
              </td>
            </tr>

            {/* ── COGS ── */}
            <SectionHeader label="Cost of Goods Sold" sectionKey="cogs" color="#b45309" />

            {!collapsedSections.has('cogs') && companies.filter(c =>
              months.some(m => cogsMap[`${c.id}-${m}`] > 0)
            ).map(company => {
              const rowTotal = months.reduce((sum, m) => sum + (cogsMap[`${company.id}-${m}`] || 0), 0)
              if (rowTotal === 0) return null
              return (
                <tr key={company.id} className="hover:bg-orange-50/50 group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-orange-50/50 px-4 py-2 text-[var(--foreground)]">
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
                  <td className="px-3 py-2 text-right text-xs font-medium text-orange-700">
                    {fmtK(rowTotal)}
                  </td>
                </tr>
              )
            })}

            {/* COGS total */}
            <tr className="bg-orange-50 font-semibold">
              <td className="sticky left-0 z-10 bg-orange-50 px-4 py-2.5 text-xs uppercase tracking-wide text-orange-700">
                Total COGS
              </td>
              {monthlyCogs.map((v, i) => (
                <td key={i} className="px-2 py-2.5 text-center text-xs text-orange-700">
                  {v > 0 ? fmtK(v) : '—'}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right text-xs text-orange-700">{fmtK(totalCogs)}</td>
            </tr>

            {/* Gross Profit */}
            <tr className="bg-[var(--bright-teal)]/10 font-semibold border-t-2 border-[var(--bright-teal)]/30">
              <td className="sticky left-0 z-10 bg-[var(--bright-teal)]/10 px-4 py-2.5 text-xs uppercase tracking-wide text-[var(--bright-teal)]">
                Gross Profit
              </td>
              {monthlyGrossProfit.map((v, i) => (
                <td key={i} className={cn('px-2 py-2.5 text-center text-xs font-medium', v >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-500')}>
                  {fmtK(v)}
                  {monthlyRevenue[i] > 0 && (
                    <span className="block text-[10px] opacity-60">
                      {fmtPct((v / monthlyRevenue[i]) * 100)}
                    </span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right text-xs text-[var(--bright-teal)]">{fmtK(totalGP)}</td>
            </tr>

            {/* ── OPERATING EXPENSES ── */}
            <SectionHeader label="Operating Expenses" sectionKey="opex" color="#7c3aed" />

            {!collapsedSections.has('opex') && uniqueVendors.map(vendor => {
              const rowTotal = months.reduce((sum, m) => sum + (expMap[`${vendor}-${m}`] || 0), 0)
              return (
                <tr key={vendor} className="hover:bg-purple-50/50 group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-purple-50/50 px-4 py-2 text-[var(--foreground)] text-xs">
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
                  <td className="px-3 py-2 text-right text-xs font-medium text-purple-700">
                    {rowTotal > 0 ? fmtK(rowTotal) : '—'}
                  </td>
                </tr>
              )
            })}

            {/* OpEx total */}
            <tr className="bg-purple-50 font-semibold">
              <td className="sticky left-0 z-10 bg-purple-50 px-4 py-2.5 text-xs uppercase tracking-wide text-purple-700">
                Total OpEx
              </td>
              {monthlyOpex.map((v, i) => (
                <td key={i} className="px-2 py-2.5 text-center text-xs text-purple-700">
                  {v > 0 ? fmtK(v) : '—'}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right text-xs text-purple-700">{fmtK(totalOpex)}</td>
            </tr>

            {/* Net Income */}
            <tr className="font-bold border-t-2 border-[var(--dark-navy)]">
              <td className="sticky left-0 z-10 bg-[var(--dark-navy)] text-white px-4 py-3 text-xs uppercase tracking-wide">
                Net Income
              </td>
              {monthlyNetIncome.map((v, i) => (
                <td key={i} className={cn('px-2 py-3 text-center text-xs bg-[var(--dark-navy)]', v >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-400')}>
                  <span className="flex items-center justify-center gap-0.5">
                    {v >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {fmtK(v)}
                  </span>
                </td>
              ))}
              <td className={cn('px-3 py-3 text-right text-sm bg-[var(--dark-navy)]', totalNet >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-400')}>
                {fmtK(totalNet)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
