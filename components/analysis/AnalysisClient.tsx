'use client'
import { formatCurrencyFull, formatMonth, cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'

type RevenueRow = { company_id: number; company_name: string; slug: string; month: string; actual: number; budget: number; is_recurring: boolean }
type CogsRow = { company_id: number; company_name: string; month: string; cost: number; contractor_name: string | null }
type ExpenseRow = { vendor_name: string; month: string; planned_amount: number; actual_amount: number }
type Goal = { revenue_goal: number; revenue_stretch_goal: number } | null
type Proposal = { id: number; client_name: string; total_revenue: number; weighted_likelihood: number; stage: string }

interface Props {
  year: number; months: string[]
  revenue: RevenueRow[]; cogs: CogsRow[]; expenses: ExpenseRow[]
  goal: Goal; proposals: Proposal[]
}

export function AnalysisClient({ year, months, revenue, cogs, expenses, goal, proposals }: Props) {
  // Monthly aggregates
  const revByMonth = months.map(m =>
    revenue.filter(r => r.month === m).reduce((s, r) => s + Number(r.actual ?? r.budget ?? 0), 0)
  )
  const cogsByMonth = months.map(m =>
    cogs.filter(c => c.month === m).reduce((s, c) => s + Number(c.cost), 0)
  )
  const opexByMonth = months.map(m =>
    expenses.filter(e => e.month === m).reduce((s, e) => s + Number(e.planned_amount), 0)
  )
  const gpByMonth = months.map((_, i) => revByMonth[i] - cogsByMonth[i])
  const netByMonth = months.map((_, i) => gpByMonth[i] - opexByMonth[i])

  const totalRev = revByMonth.reduce((a, b) => a + b, 0)
  const totalCogs = cogsByMonth.reduce((a, b) => a + b, 0)
  const totalOpex = opexByMonth.reduce((a, b) => a + b, 0)
  const totalGP = totalRev - totalCogs
  const totalNet = totalGP - totalOpex
  const gmPct = totalRev > 0 ? (totalGP / totalRev) * 100 : 0

  const goalPct = goal ? Math.min(100, (totalRev / goal.revenue_goal) * 100) : null

  // Chart data
  const chartData = months.map((m, i) => ({
    month: formatMonth(m),
    Revenue: revByMonth[i],
    'Gross Profit': gpByMonth[i],
    'Net Income': netByMonth[i],
  }))

  // Per-client revenue
  const clientMap: Record<string, { name: string; rev: number; cogs: number }> = {}
  for (const r of revenue) {
    if (!clientMap[r.company_name]) clientMap[r.company_name] = { name: r.company_name, rev: 0, cogs: 0 }
    clientMap[r.company_name].rev += Number(r.actual ?? r.budget ?? 0)
  }
  for (const c of cogs) {
    if (clientMap[c.company_name]) clientMap[c.company_name].cogs += Number(c.cost)
  }
  const clientRows = Object.values(clientMap)
    .map(c => ({ ...c, gm: c.rev > 0 ? ((c.rev - c.cogs) / c.rev) * 100 : 0 }))
    .sort((a, b) => b.rev - a.rev)

  // Weighted pipeline
  const weightedPipeline = proposals.reduce((s, p) => s + Number(p.total_revenue) * p.weighted_likelihood / 100, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Annual Analysis</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{year} overview</p>
        </div>
        <div className="flex gap-1">
          {[year - 1, year, year + 1].map(y => (
            <a key={y} href={`/analysis/annual?year=${y}`}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                y === year ? 'bg-[var(--deep-teal)] text-white' : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
              )}>
              {y}
            </a>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrencyFull(totalRev), color: 'text-[var(--deep-teal)]' },
          { label: 'Gross Profit', value: formatCurrencyFull(totalGP), sub: `${Math.round(gmPct)}% GM`, color: 'text-[var(--bright-teal)]' },
          { label: 'Net Income', value: formatCurrencyFull(totalNet), color: totalNet >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-500' },
          { label: 'Pipeline', value: formatCurrencyFull(weightedPipeline), sub: 'weighted', color: 'text-purple-600' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-lg border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
            <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Goal progress */}
      {goal && goalPct !== null && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--deep-teal)]">Revenue Goal Progress</p>
            <p className="text-sm font-semibold text-[var(--deep-teal)]">{Math.round(goalPct)}%</p>
          </div>
          <div className="w-full h-3 bg-[var(--border)] rounded-full">
            <div className="h-full bg-[var(--bright-teal)] rounded-full transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-[var(--muted-foreground)]">{formatCurrencyFull(totalRev)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{formatCurrencyFull(goal.revenue_goal)} goal</p>
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4 mb-6">
        <h2 className="font-heading text-base text-[var(--deep-teal)] mb-4">Monthly P&L</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrencyFull(Number(v))} />
            <Legend />
            <Bar dataKey="Revenue" fill="var(--deep-teal)" radius={[2,2,0,0]} />
            <Bar dataKey="Gross Profit" fill="var(--bright-teal)" radius={[2,2,0,0]} />
            <Bar dataKey="Net Income" fill="#7c3aed" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-client breakdown */}
      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Client Performance</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-xs">
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-right">Revenue</th>
              <th className="px-4 py-2 text-right">COGS</th>
              <th className="px-4 py-2 text-right">Gross Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {clientRows.map(c => (
              <tr key={c.name} className="hover:bg-[var(--light-mint)]/30">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2 text-right">{formatCurrencyFull(c.rev)}</td>
                <td className="px-4 py-2 text-right text-orange-600">{c.cogs > 0 ? formatCurrencyFull(c.cogs) : '—'}</td>
                <td className="px-4 py-2 text-right">
                  <span className={cn('font-medium', c.gm >= 60 ? 'text-[var(--bright-teal)]' : c.gm >= 30 ? 'text-yellow-600' : 'text-red-500')}>
                    {Math.round(c.gm)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
