import { sql } from '@/lib/db'
import { AnalysisClient } from '@/components/analysis/AnalysisClient'

export const dynamic = 'force-dynamic'

export default async function AnnualAnalysisPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams
  const year = parseInt(params.year || new Date().getFullYear().toString())
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

  const [revenue, goals, proposals] = await Promise.all([
    sql`
      SELECT cf.*, c.name as company_name, c.slug, c.is_recurring
      FROM client_financials cf
      JOIN companies c ON c.id = cf.company_id
      WHERE cf.month = ANY(${months}) AND cf.category = 'revenue'
    `,
    sql`SELECT * FROM annual_goals WHERE year = ${year}`,
    sql`SELECT * FROM proposals WHERE status = 'open'`,
  ])

  return (
    <AnalysisClient
      year={year}
      months={months}
      revenue={revenue as any}
      goal={(goals[0] as any) || null}
      proposals={proposals as any}
    />
  )
}
