import { sql } from '@/lib/db'
import { ensureBrandStatsTables } from '@/lib/brand-stats'

export async function syncYouTubeChannel(channelId: 'youtube_mmg' | 'youtube_andy') {
  await ensureBrandStatsTables()
  const connections = await sql`SELECT refresh_token FROM brand_connections WHERE channel_id = ${channelId}`
  if (!connections[0]) return { channelId, status: 'not_connected' }
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: String(connections[0].refresh_token), grant_type: 'refresh_token' }),
  })
  const token = await tokenResponse.json()
  if (!tokenResponse.ok || !token.access_token) throw new Error(`Could not refresh ${channelId} authorization.`)
  const headers = { Authorization: `Bearer ${token.access_token}` }
  const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true', { headers })
  const channel = await channelResponse.json()
  if (!channelResponse.ok || !channel.items?.[0]) throw new Error(`Could not load ${channelId} channel statistics.`)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
  analyticsUrl.search = new URLSearchParams({ ids: 'channel==MINE', startDate: yesterday, endDate: yesterday, metrics: 'views,impressions' }).toString()
  const analyticsResponse = await fetch(analyticsUrl, { headers })
  const analytics = await analyticsResponse.json()
  const row = analytics.rows?.[0] || [0, 0]
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, views, impressions, source) VALUES (${channelId}, ${yesterday}, ${Number(channel.items[0].statistics.subscriberCount || 0)}, ${Number(row[0] || 0)}, ${Number(row[1] || 0)}, 'youtube') ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = EXCLUDED.followers, views = EXCLUDED.views, impressions = EXCLUDED.impressions, source = EXCLUDED.source`
  return { channelId, status: 'synced' }
}
