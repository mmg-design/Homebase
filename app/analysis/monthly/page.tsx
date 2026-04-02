import { sql } from '@/lib/db'
import { redirect } from 'next/navigation'
import { formatCurrencyFull, formatMonth, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MonthlyAnalysisPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams
  const now = new Date()
  const month = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [revenue, cogs, expenses] = await Promise.all([
    sql`
      SELECT cf.*, c.name as company_name, c.slug
      FROM client_financials cf
      JOIN companies c ON c.id = cf.company_id
      WHERE cf.month = ${month} AND cf.category = 'revenue'
      ORDER BY cf.actual DESC NULLS LAST
    `,
    sql`
      SELECT cb.*, c.name as company_name, co.name as contractor_name
      FROM cogs_breakdown cb
      JOIN companies c ON c.id = cb.company_id
      LEFT JOIN contractors co ON co.id = cb.contractor_id
      WHERE cb.month = ${month}
    `,
    sql`SELECT * FROM vendor_expenses WHERE month = ${month}`,
  ])

  const totalRev = (revenue as any[]).reduce((s: number, r: any) => s + Number(r.actual ?? r.budget ?? 0), 0)
  const totalCogs = (cogs as any[]).reduce((s: number, c: any) => s + Number(c.cost), 0)
  const totalOpex = (expenses as any[]).reduce((s: number, e: any) => s + Number(e.planned_amount), 0)
  const gp = totalRev - totalCogs
  const net = gp - totalOpex
  const gmPct = totalRev > 0 ? (gp / totalRev) * 100 : 0

  // Generate recent months for nav
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Monthly Analysis</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{formatMonth(month)}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {recentMonths.map(m => (
            <a key={m} href={`/analysis/monthly?month=${m}`}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                m === month ? 'bg-[var(--deep-teal)] text-white' : 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'
              )}>
              {formatMonth(m)}
            </a>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenue', value: formatCurrencyFull(totalRev), color: 'text-[var(--deep-teal)]' },
          { label: 'COGS', value: formatCurrencyFull(totalCogs), color: 'text-orange-600' },
          { label: 'Gross Profit', value: formatCurrencyFull(gp), sub: `${Math.round(gmPct)}% margin`, color: 'text-[var(--bright-teal)]' },
          { label: 'Net Income', value: formatCurrencyFull(net), color: net >= 0 ? 'text-[var(--bright-teal)]' : 'text-red-500' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-lg border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
            <p className={`text-lg font-semibold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Client breakdown */}
      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Revenue by Client</h2>
        </div>
        {revenue.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted-foreground)] text-center">No revenue data for this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-xs">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-right">Actual</th>
                <th className="px-4 py-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(revenue as any[]).map((r: any) => {
                const amt = Number(r.actual ?? r.budget ?? 0)
                const pct = totalRev > 0 ? (amt / totalRev) * 100 : 0
                return (
                  <tr key={r.id} className="hover:bg-[var(--light-mint)]/30">
                    <td className="px-4 py-2 font-medium">{r.company_name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrencyFull(amt)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-[var(--border)] rounded-full">
                          <div className="h-full bg-[var(--bright-teal)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expenses */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="font-heading text-base text-[var(--deep-teal)]">Operating Expenses</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-xs">
                <th className="px-4 py-2 text-left">Vendor</th>
                <th className="px-4 py-2 text-right">Planned</th>
                <th className="px-4 py-2 text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(expenses as any[]).map((e: any) => (
                <tr key={e.id} className="hover:bg-[var(--light-mint)]/30">
                  <td className="px-4 py-2">{e.vendor_name}</td>
                  <td className="px-4 py-2 text-right">{formatCurrencyFull(Number(e.planned_amount))}</td>
                  <td className="px-4 py-2 text-right">{e.actual_amount ? formatCurrencyFull(Number(e.actual_amount)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
