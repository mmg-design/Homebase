import { sql } from '@/lib/db'
import Link from 'next/link'
import { formatCurrencyFull } from '@/lib/utils'
import { Users, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const companies = await sql`
    SELECT
      c.*,
      COALESCE(SUM(cf.actual), 0) as total_revenue,
      COUNT(DISTINCT cf.month) as active_months
    FROM companies c
    LEFT JOIN client_financials cf ON cf.company_id = c.id AND cf.category = 'revenue'
    GROUP BY c.id
    ORDER BY total_revenue DESC
  `

  const recurring = (companies as any[]).filter((c: any) => c.is_recurring)
  const project = (companies as any[]).filter((c: any) => !c.is_recurring)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Clients</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {companies.length} total · {recurring.length} recurring
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
          Recurring
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recurring.map((c: any) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
          Project Work
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {project.map((c: any) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ClientCard({ client }: { client: any }) {
  return (
    <Link
      href={`/clients/${client.slug}`}
      className="block p-4 bg-white rounded-lg border border-[var(--border)] hover:border-[var(--bright-teal)] hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <p className="font-medium text-[var(--foreground)] group-hover:text-[var(--deep-teal)] transition-colors leading-tight">
          {client.name}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          client.status === 'active' ? 'bg-[var(--light-mint)] text-[var(--bright-teal)]' : 'bg-gray-100 text-gray-500'
        }`}>
          {client.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">Total Revenue</p>
          <p className="text-sm font-semibold text-[var(--deep-teal)]">
            {formatCurrencyFull(Number(client.total_revenue))}
          </p>
        </div>
        {client.active_months > 0 && (
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Months</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{client.active_months}</p>
          </div>
        )}
      </div>
    </Link>
  )
}
