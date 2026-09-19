import { NextRequest, NextResponse } from 'next/server'
import { saveHighestBrandStat } from '@/lib/brand-stats'
import { BRAND_CHANNELS } from '@/lib/brand-channels'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const channel = BRAND_CHANNELS.find(item => item.id === body.channel_id)
  const date = typeof body.logged_on === 'string' ? body.logged_on : ''
  if (!channel || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Invalid channel or date.' }, { status: 400 })
  const metric = (value: unknown) => value === '' || value === null || value === undefined ? null : Math.max(0, Math.round(Number(value)))
  const downloads = channel.id === 'spotify' ? metric(body.downloads) : null
  const views = channel.id === 'spotify' ? null : metric(body.views)
  const stats = await saveHighestBrandStat({ channelId: channel.id, loggedOn: date, followers: metric(body.followers), impressions: downloads, views, source: 'manual', note: String(body.note || '') })
  return NextResponse.json({ ok: true, stats })
}
