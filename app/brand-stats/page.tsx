import { BrandStatsClient } from '@/components/brand-stats/BrandStatsClient'
import { ensureBrandStatsTables } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function BrandStatsPage() {
  await ensureBrandStatsTables()
  const today = new Date().toISOString().slice(0, 10)
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) VALUES ('site_spotlight', ${today}, 8, 'manual', 'Initial subscriber baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`
  await Promise.all([
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) VALUES ('linkedin', ${today}, 7664, 'manual', 'Initial follower baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, source, note) VALUES ('spotify', ${today}, 79, 458, 'manual', 'Initial followers and downloads baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) VALUES ('instagram', ${today}, 1855, 'manual', 'Initial follower baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) VALUES ('youtube_mmg', ${today}, 409, 'manual', 'Initial subscriber baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) VALUES ('youtube_andy', ${today}, 25, 'manual', 'Initial subscriber baseline') ON CONFLICT (channel_id, logged_on) DO NOTHING`,
  ])
  const [stats, connections] = await Promise.all([
    sql`SELECT channel_id, logged_on::text, followers, impressions, views, source, note FROM brand_stats ORDER BY logged_on DESC`,
    sql`SELECT channel_id FROM brand_connections`,
  ])
  return <BrandStatsClient stats={stats as any} connectedChannels={(connections as any[]).map(item => item.channel_id)} />
}
