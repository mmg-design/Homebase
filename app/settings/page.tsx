import { sql } from '@/lib/db'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [contractors, goals, templates] = await Promise.all([
    sql`SELECT * FROM contractors ORDER BY name`,
    sql`SELECT * FROM annual_goals ORDER BY year DESC`,
    sql`SELECT * FROM expense_templates ORDER BY sort_order`,
  ])

  return <SettingsClient contractors={contractors as any} goals={goals as any} templates={templates as any} />
}
