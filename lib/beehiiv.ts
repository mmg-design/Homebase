import { saveHighestBrandStat } from '@/lib/brand-stats'

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
  await saveHighestBrandStat({ channelId: 'columbus_marketing_jobs', loggedOn: today, followers: Number(stats.active_subscriptions || 0), impressions: Number(email.unique_opens || email.opens || 0), views: Number(web.views || 0), source: 'beehiiv' })
  return { channelId: 'columbus_marketing_jobs', status: 'synced', publication: publication.name }
}
