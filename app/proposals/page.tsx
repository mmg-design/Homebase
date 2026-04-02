import { sql } from '@/lib/db'
import { ProposalsClient } from '@/components/proposals/ProposalsClient'

export const dynamic = 'force-dynamic'

export default async function ProposalsPage() {
  const [proposals, companies] = await Promise.all([
    sql`SELECT * FROM proposals ORDER BY created_at DESC`,
    sql`SELECT id, name, slug FROM companies ORDER BY name`,
  ])

  return <ProposalsClient proposals={proposals as any} companies={companies as any} />
}
