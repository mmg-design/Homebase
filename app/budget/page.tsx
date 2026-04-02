import { sql } from '@/lib/db'
import { BudgetClient } from '@/components/financials/BudgetClient'

export const dynamic = 'force-dynamic'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const params = await searchParams
  const year = parseInt(params.year || new Date().getFullYear().toString())

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )

  const [companies, revenue, cogs, expenses, goals, contractors] = await Promise.all([
    sql`SELECT * FROM companies WHERE status = 'active' ORDER BY name`,
    sql`
      SELECT cf.*, c.name as company_name, c.slug
      FROM client_financials cf
      JOIN companies c ON c.id = cf.company_id
      WHERE cf.month = ANY(${months}) AND cf.category = 'revenue'
      ORDER BY c.name, cf.month
    `,
    sql`
      SELECT cb.*, c.name as company_name, c.slug, co.name as contractor_name
      FROM cogs_breakdown cb
      JOIN companies c ON c.id = cb.company_id
      LEFT JOIN contractors co ON co.id = cb.contractor_id
      WHERE cb.month = ANY(${months})
    `,
    sql`
      SELECT * FROM vendor_expenses WHERE month = ANY(${months}) ORDER BY vendor_name
    `,
    sql`SELECT * FROM annual_goals WHERE year = ${year}`,
    sql`SELECT * FROM contractors WHERE is_active = true ORDER BY name`,
  ])

  return (
    <BudgetClient
      year={year}
      months={months}
      companies={companies as any}
      revenue={revenue as any}
      cogs={cogs as any}
      expenses={expenses as any}
      goal={(goals[0] as any) || null}
      contractors={contractors as any}
    />
  )
}
