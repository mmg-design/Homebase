import { sql } from '@/lib/db'
import { notFound } from 'next/navigation'
import { formatCurrencyFull, formatMonth } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ensureCompanyCategories } from '@/lib/companies'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureCompanyCategories()
  const { slug } = await params

  const companies = await sql`SELECT * FROM companies WHERE slug = ${slug}`
  if (!companies.length) notFound()
  const company = companies[0]

  const [revenue, cogs, contacts] = await Promise.all([
    sql`
      SELECT * FROM client_financials
      WHERE company_id = ${company.id} AND category = 'revenue'
      ORDER BY month DESC
    `,
    sql`
      SELECT cb.*, co.name as contractor_name
      FROM cogs_breakdown cb
      LEFT JOIN contractors co ON co.id = cb.contractor_id
      WHERE cb.company_id = ${company.id}
      ORDER BY cb.month DESC
    `,
    sql`SELECT * FROM company_contacts WHERE company_id = ${company.id}`,
  ])

  const totalRevenue = (revenue as any[]).reduce((s: number, r: any) => s + Number(r.actual ?? r.budget ?? 0), 0)
  const totalCogs = (cogs as any[]).reduce((s: number, c: any) => s + Number(c.cost), 0)
  const gm = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0

  return (
    <div className="min-h-screen bg-[var(--background)] py-6 px-4">
      <div className="max-w-4xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--deep-teal)] mb-4 transition-colors">
        <ArrowLeft size={14} /> All Clients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="retro-client-name font-heading text-2xl text-[var(--deep-teal)]">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge tone={company.status === 'active' ? 'neutral' : 'muted'} className="normal-case text-xs px-2 py-0.5">{company.status}</Badge>
            {company.is_recurring && (
              <Badge tone="neutral" className="normal-case text-xs px-2 py-0.5">recurring</Badge>
            )}
            {company.client_category === 'website_seo' && <Badge tone="blue" className="normal-case text-xs px-2 py-0.5">Website &amp; SEO</Badge>}
            {company.client_category === 'brand_deal' && <Badge tone="amber" className="normal-case text-xs px-2 py-0.5">Brand Deal</Badge>}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Total Revenue</p>
          <p className="text-xl font-semibold text-[var(--deep-teal)] mt-1">{formatCurrencyFull(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Total COGS</p>
          <p className="text-xl font-semibold text-orange-600 mt-1">{formatCurrencyFull(totalCogs)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Gross Margin</p>
          <p className={`text-xl font-semibold mt-1 ${gm >= 50 ? 'text-[var(--bright-teal)]' : gm >= 25 ? 'text-yellow-600' : 'text-red-500'}`}>
            {Math.round(gm)}%
          </p>
        </Card>
      </div>

      {/* Revenue history */}
      <Card className="overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Revenue History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-xs">
              <th className="px-4 py-2 text-left">Month</th>
              <th className="px-4 py-2 text-right">Budget</th>
              <th className="px-4 py-2 text-right">Actual</th>
              <th className="px-4 py-2 text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {(revenue as any[]).map((r: any) => (
              <tr key={r.id} className="hover:bg-[var(--light-mint)]/30">
                <td className="px-4 py-2">{formatMonth(r.month)}</td>
                <td className="px-4 py-2 text-right">{r.budget ? formatCurrencyFull(Number(r.budget)) : '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{r.actual ? formatCurrencyFull(Number(r.actual)) : '—'}</td>
                <td className="px-4 py-2 text-right">
                  <Badge tone={r.source === 'actual' ? 'emerald' : 'muted'} className="normal-case rounded px-1.5 py-0.5">
                    {r.source}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Notes */}
      {company.notes && (
        <div className="bg-[var(--light-mint)] rounded-xl p-4">
          <h3 className="font-medium text-[var(--deep-teal)] text-sm mb-1">Notes</h3>
          <p className="text-sm text-[var(--foreground)]">{company.notes}</p>
        </div>
      )}
      </div>
    </div>
  )
}
