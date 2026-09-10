import { sql } from '@/lib/db'
import { ensureBrandStatsTables } from '@/lib/brand-stats'
import { BRAND_CHANNELS } from '@/lib/brand-channels'

export async function syncXProfile() {
  const bearerToken = process.env.X_BEARER_TOKEN
  const channel = BRAND_CHANNELS.find(item => item.id === 'x')
  if (!bearerToken || !channel?.handle) return { channelId: 'x', status: 'not_connected' }
  const response = await fetch(`https://api.twitter.com/2/users/by/username/${channel.handle}?user.fields=public_metrics`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  const body = await response.json()
  const metrics = body.data?.public_metrics
  if (!response.ok || !metrics) throw new Error('Could not load X profile statistics.')
  const today = new Date().toISOString().slice(0, 10)
  await ensureBrandStatsTables()
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, source) VALUES ('x', ${today}, ${Number(metrics.followers_count || 0)}, ${Number(metrics.tweet_count || 0)}, 'x') ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = EXCLUDED.followers, impressions = EXCLUDED.impressions, source = EXCLUDED.source`
  return { channelId: 'x', status: 'synced' }
}
