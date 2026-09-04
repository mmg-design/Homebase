import { sql } from '@/lib/db'
import { BudgetClient } from '@/components/financials/BudgetClient'
import { ensureCompanyCategories } from '@/lib/companies'

export const dynamic = 'force-dynamic'

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await ensureCompanyCategories()
  const params = await searchParams
  const year = parseInt(params.year || new Date().getFullYear().toString())
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  const [companies, revenue, goals] = await Promise.all([
    sql`SELECT * FROM companies WHERE status = 'active' ORDER BY is_recurring DESC, name ASC`,
    sql`SELECT * FROM client_financials WHERE month = ANY(${months}) AND category = 'revenue'`,
    sql`SELECT * FROM annual_goals WHERE year = ${year}`,
  ])
  return <BudgetClient year={year} months={months} companies={companies as any} revenue={revenue as any} goal={(goals[0] as any) || null} />
}
