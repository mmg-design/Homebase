import { sql } from '@/lib/db'
import { ensureBrandStatsTables } from '@/lib/brand-stats'

const GRAPH_VERSION = 'v22.0'

export async function syncInstagramAccount() {
  await ensureBrandStatsTables()
  const connections = await sql`SELECT refresh_token, external_id FROM brand_connections WHERE channel_id = 'instagram'`
  const connection = connections[0]
  if (!connection?.external_id) return { channelId: 'instagram', status: 'not_connected' }
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${connection.external_id}?fields=followers_count&access_token=${connection.refresh_token}`)
  const body = await response.json()
  if (!response.ok || typeof body.followers_count !== 'number') throw new Error('Could not load Instagram account statistics.')
  const today = new Date().toISOString().slice(0, 10)
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, source) VALUES ('instagram', ${today}, ${body.followers_count}, 'instagram') ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = EXCLUDED.followers, source = EXCLUDED.source`
  return { channelId: 'instagram', status: 'synced' }
}
