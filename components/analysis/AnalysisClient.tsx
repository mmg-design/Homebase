'use client'
import { useState, useMemo } from 'react'
import { formatCurrencyFull, formatMonth, cn } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type RevenueRow = { company_id: number; company_name: string; slug: string; month: string; actual: number; budget: number; is_recurring: boolean }
type CogsRow    = { company_id: number; company_name: string; month: string; cost: number }
type ExpenseRow = { vendor_name: string; month: string; planned_amount: number }
type Goal       = { revenue_goal: number; revenue_stretch_goal: number } | null
type Proposal   = { id: number; client_name: string; total_revenue: number; weighted_likelihood: number; stage: string }

interface Props {
  year: number; months: string[]
  revenue: RevenueRow[]; cogs: CogsRow[]; expenses: ExpenseRow[]
  goal: Goal; proposals: Proposal[]
}

export function AnalysisClient({ year, months, revenue, cogs, expenses, goal, proposals }: Props) {
  // Month range filter — default to all 12
  const [fromMonth, setFromMonth] = useState(months[0])
  const [toMonth,   setToMonth]   = useState(months[months.length - 1])

  const filteredMonths = useMemo(
    () => months.filter(m => m >= fromMonth && m <= toMonth),
    [months, fromMonth, toMonth]
  )

  // ── aggregates over filtered range ────────────────────────────────────────
  const revByMonth = filteredMonths.map(m =>
    revenue.filter(r => r.month === m).reduce((s, r) => s + Number(r.actual ?? r.budget ?? 0), 0)
  )
  const cogsByMonth = filteredMonths.map(m =>
    cogs.filter(c => c.month === m).reduce((s, c) => s + Number(c.cost), 0)
  )
  const opexByMonth = filteredMonths.map(m =>
    expenses.filter(e => e.month === m).reduce((s, e) => s + Number(e.planned_amount), 0)
  )
  const gpByMonth  = filteredMonths.map((_, i) => revByMonth[i] - cogsByMonth[i])
  const netByMonth = filteredMonths.map((_, i) => gpByMonth[i] - opexByMonth[i])

  const totalRev  = revByMonth.reduce((a, b) => a + b, 0)
  const totalCogs = cogsByMonth.reduce((a, b) => a + b, 0)
  const totalOpex = opexByMonth.reduce((a, b) => a + b, 0)
  const totalGP   = totalRev - totalCogs
  const totalNet  = totalGP - totalOpex
  const gmPct     = totalRev > 0 ? (totalGP / totalRev) * 100 : 0
  const goalPct   = goal ? Math.min(100, (totalRev / goal.revenue_goal) * 100) : null
  const weightedPipeline = proposals.reduce((s, p) => s + Number(p.total_revenue) * p.weighted_likelihood / 100, 0)

  // ── per-client breakdown ──────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; rev: number; cogs: number }> = {}
  for (const r of revenue.filter(r => filteredMonths.includes(r.month))) {
    if (!clientMap[r.company_name]) clientMap[r.company_name] = { name: r.company_name, rev: 0, cogs: 0 }
    clientMap[r.company_name].rev += Number(r.actual ?? r.budget ?? 0)
  }
  for (const c of cogs.filter(c => filteredMonths.includes(c.month))) {
    if (clientMap[c.company_name]) clientMap[c.company_name].cogs += Number(c.cost)
  }
  const clientRows = Object.values(clientMap)
    .map(c => ({ ...c, gm: c.rev > 0 ? ((c.rev - c.cogs) / c.rev) * 100 : 0 }))
    .sort((a, b) => b.rev - a.rev)

  // ── chart data ────────────────────────────────────────────────────────────
  type Metric = 'Revenue' | 'Gross Profit' | 'Net Income'
  const [activeMetric, setActiveMetric] = useState<Metric>('Revenue')

  const METRICS: Array<{ key: Metric; color: string; gradientId: string }> = [
    { key: 'Revenue',      color: '#0c6b78', gradientId: 'grad-rev' },
    { key: 'Gross Profit', color: '#1aadbd', gradientId: 'grad-gp'  },
    { key: 'Net Income',   color: '#7c3aed', gradientId: 'grad-net' },
  ]

  const chartData = filteredMonths.map((m, i) => ({
    month:          formatMonth(m),
    Revenue:        revByMonth[i],
    'Gross Profit': gpByMonth[i],
    'Net Income':   netByMonth[i],
  }))

  const active = METRICS.find(m => m.key === activeMetric)!

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const val = payload[0]?.value ?? 0
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 min-w-[140px]">
        <p className="text-[11px] text-gray-400 mb-1">{label}</p>
        <p className="text-base font-semibold text-gray-800">{formatCurrencyFull(val)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: active.color }}>{activeMetric}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Analysis</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{year} overview</p>
          </div>
          <div className="flex gap-1">
            {[year - 1, year, year + 1].map(y => (
              <a key={y} href={`/analysis/annual?year=${y}`}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  y === year ? 'bg-[var(--deep-teal)] text-white' : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
                )}>
                {y}
              </a>
            ))}
          </div>
        </div>

        {/* Month range filter */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm px-5 py-3 flex items-center gap-4 flex-wrap">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Filter by month range:</p>
          <div className="flex items-center gap-2">
            <select
              value={fromMonth}
              onChange={e => setFromMonth(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs outline-none focus:border-[var(--bright-teal)]"
            >
              {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
            </select>
            <span className="text-[var(--muted-foreground)] text-xs">to</span>
            <select
              value={toMonth}
              onChange={e => setToMonth(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs outline-none focus:border-[var(--bright-teal)]"
            >
              {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setFromMonth(months[0]); setToMonth(months[months.length - 1]) }}
            className="text-xs text-[var(--bright-teal)] hover:underline"
          >
            Reset
          </button>
          <p className="text-xs text-[var(--muted-foreground)] ml-auto">
            {filteredMonths.length} month{filteredMonths.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue',  value: formatCurrencyFull(totalRev),  color: 'text-[var(--deep-teal)]' },
            { label: 'Gross Profit',   value: formatCurrencyFull(totalGP),   sub: `${Math.round(gmPct)}% margin`, color: 'text-[var(--bright-teal)]' },
            { label: 'Net Income',     value: formatCurrencyFull(totalNet),  color: totalNet >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-500' },
            { label: 'Pipeline',       value: formatCurrencyFull(weightedPipeline), sub: 'weighted', color: 'text-purple-600' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-4">
              <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
              {sub && <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Goal progress */}
        {goal && goalPct !== null && (
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--deep-teal)]">Revenue Goal Progress</p>
              <p className="text-sm font-semibold text-[var(--bright-teal)]">{Math.round(goalPct)}%</p>
            </div>
            <div className="w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${goalPct}%`,
                  background: 'linear-gradient(90deg, var(--deep-teal), var(--bright-teal))',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-xs text-[var(--muted-foreground)]">{formatCurrencyFull(totalRev)} earned</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatCurrencyFull(goal.revenue_goal)} goal</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base text-[var(--deep-teal)]">Monthly P&L</h2>
            <div className="flex gap-1">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(m.key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    activeMetric === m.key
                      ? 'text-white shadow-sm'
                      : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                  )}
                  style={activeMetric === m.key ? { backgroundColor: m.color } : {}}
                >
                  {m.key}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                {METRICS.map(m => (
                  <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={m.color} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                horizontal vertical={false}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: active.color, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                key={activeMetric}
                type="monotone"
                dataKey={activeMetric}
                stroke={active.color}
                strokeWidth={2}
                fill={`url(#${active.gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: active.color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Client breakdown */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="font-heading text-base text-[var(--deep-teal)]">Client Performance</h2>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              {filteredMonths.length === 12 ? 'Full year' : `${formatMonth(fromMonth)} – ${formatMonth(toMonth)}`}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-[11px] uppercase tracking-wide">
                <th className="px-5 py-2 text-left">Client</th>
                <th className="px-5 py-2 text-right">Revenue</th>
                <th className="px-5 py-2 text-right">Labor</th>
                <th className="px-5 py-2 text-right">Gross Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {clientRows.map(c => (
                <tr key={c.name} className="hover:bg-[var(--light-mint)]/30 transition-colors">
                  <td className="px-5 py-2.5 font-medium">{c.name}</td>
                  <td className="px-5 py-2.5 text-right">{formatCurrencyFull(c.rev)}</td>
                  <td className="px-5 py-2.5 text-right text-orange-600">
                    {c.cogs > 0 ? formatCurrencyFull(c.cogs) : <span className="text-[var(--muted-foreground)]">—</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={cn(
                      'font-semibold text-xs px-2 py-0.5 rounded-full',
                      c.cogs > 0
                        ? c.gm >= 60 ? 'bg-[var(--light-mint)] text-[var(--bright-teal)]'
                        : c.gm >= 30 ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-600'
                        : 'bg-gray-50 text-gray-400'
                    )}>
                      {c.cogs > 0 ? `${Math.round(c.gm)}%` : 'No labor'}
                    </span>
                  </td>
                </tr>
              ))}
              {clientRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    No revenue data for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
