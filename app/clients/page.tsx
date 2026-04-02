import { sql } from '@/lib/db'
import { ClientsClient } from '@/components/clients/ClientsClient'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const [companies, cogs] = await Promise.all([
    sql`
      SELECT
        c.*,
        COALESCE(SUM(CASE WHEN cf.category = 'revenue' THEN cf.actual ELSE 0 END), 0) as total_revenue,
        COUNT(DISTINCT cf.month) FILTER (WHERE cf.category = 'revenue') as active_months
      FROM companies c
      LEFT JOIN client_financials cf ON cf.company_id = c.id
      GROUP BY c.id
      ORDER BY c.is_recurring DESC, total_revenue DESC
    `,
    sql`
      SELECT cb.company_id, cb.month, cb.cost, cb.hours, cb.rate,
             co.name as contractor_name
      FROM cogs_breakdown cb
      LEFT JOIN contractors co ON co.id = cb.contractor_id
      ORDER BY cb.month DESC
    `,
  ])

  return <ClientsClient companies={companies as any} cogs={cogs as any} />
}
