import { BrandStatsClient } from '@/components/brand-stats/BrandStatsClient'
import { ensureBrandStatsTables } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function BrandStatsPage() {
  await ensureBrandStatsTables()
  const [stats, connections] = await Promise.all([
    sql`SELECT channel_id, logged_on::text, followers, impressions, views, source, note FROM brand_stats ORDER BY logged_on DESC`,
    sql`SELECT channel_id FROM brand_connections`,
  ])
  return <BrandStatsClient stats={stats as any} connectedChannels={(connections as any[]).map(item => item.channel_id)} />
}
