import { BrandStatsClient } from '@/components/brand-stats/BrandStatsClient'
import { ensureBrandStatsTables, normalizeBrandStatHighWaterMarks } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function BrandStatsPage() {
  await ensureBrandStatsTables()
  await normalizeBrandStatHighWaterMarks()
  const today = new Date().toISOString().slice(0, 10)
  await Promise.all([
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) SELECT 'linkedin', ${today}, 7664, 'manual', 'Initial follower baseline' WHERE NOT EXISTS (SELECT 1 FROM brand_stats WHERE channel_id = 'linkedin')`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, source, note) SELECT 'spotify', ${today}, 79, 4458, 'manual', 'Initial followers and downloads baseline' WHERE NOT EXISTS (SELECT 1 FROM brand_stats WHERE channel_id = 'spotify')`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) SELECT 'instagram', ${today}, 1855, 'manual', 'Initial follower baseline' WHERE NOT EXISTS (SELECT 1 FROM brand_stats WHERE channel_id = 'instagram')`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) SELECT 'youtube_mmg', ${today}, 409, 'manual', 'Initial subscriber baseline' WHERE NOT EXISTS (SELECT 1 FROM brand_stats WHERE channel_id = 'youtube_mmg')`,
    sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source, note) SELECT 'youtube_andy', ${today}, 25, 'manual', 'Initial subscriber baseline' WHERE NOT EXISTS (SELECT 1 FROM brand_stats WHERE channel_id = 'youtube_andy')`,
  ])
  const [stats, connections] = await Promise.all([
    sql`SELECT channel_id, logged_on::text, followers, impressions, views, source, note FROM brand_stats ORDER BY logged_on DESC`,
    sql`SELECT channel_id FROM brand_connections`,
  ])
  return <BrandStatsClient stats={stats as any} connectedChannels={(connections as any[]).map(item => item.channel_id)} />
}
