import { sql } from '@/lib/db'
import { ensureBrandStatsTables } from '@/lib/brand-stats'

export async function syncBeehiivNewsletter() {
  const apiKey = process.env.BEEHIIV_API_KEY
  if (!apiKey) return { channelId: 'columbus_marketing_jobs', status: 'not_connected' }
  const headers = { Authorization: `Bearer ${apiKey}` }
  const publicationResponse = await fetch('https://api.beehiiv.com/v2/publications', { headers })
  const publications = await publicationResponse.json()
  const publication = publications.data?.[0]
  if (!publicationResponse.ok || !publication?.id) throw new Error('Could not load Beehiiv publication.')
  const [detailResponse, aggregateResponse] = await Promise.all([
    fetch(`https://api.beehiiv.com/v2/publications/${publication.id}?expand[]=stats`, { headers }),
    fetch(`https://api.beehiiv.com/v2/publications/${publication.id}/posts/aggregate_stats`, { headers }),
  ])
  const detail = await detailResponse.json()
  const aggregate = await aggregateResponse.json()
  if (!detailResponse.ok) throw new Error('Could not load Beehiiv publication statistics.')
  const stats = detail.data?.stats || publication.stats || {}
  const email = aggregate.data?.stats?.email || {}
  const web = aggregate.data?.stats?.web || {}
  const today = new Date().toISOString().slice(0, 10)
  await ensureBrandStatsTables()
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, views, source) VALUES ('columbus_marketing_jobs', ${today}, ${Number(stats.active_subscriptions || 0)}, ${Number(email.unique_opens || email.opens || 0)}, ${Number(web.views || 0)}, 'beehiiv') ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = EXCLUDED.followers, impressions = EXCLUDED.impressions, views = EXCLUDED.views, source = EXCLUDED.source`
  return { channelId: 'columbus_marketing_jobs', status: 'synced', publication: publication.name }
}
