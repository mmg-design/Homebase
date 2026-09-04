import { NextRequest, NextResponse } from 'next/server'
import { BRAND_CHANNELS, ensureBrandStatsTables } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const channel = BRAND_CHANNELS.find(item => item.id === body.channel_id)
  const date = typeof body.logged_on === 'string' ? body.logged_on : ''
  if (!channel || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Invalid channel or date.' }, { status: 400 })
  const metric = (value: unknown) => value === '' || value === null || value === undefined ? null : Math.max(0, Math.round(Number(value)))
  await ensureBrandStatsTables()
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, views, source, note) VALUES (${channel.id}, ${date}, ${metric(body.followers)}, ${metric(body.impressions)}, ${metric(body.views)}, 'manual', ${String(body.note || '')}) ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = EXCLUDED.followers, impressions = EXCLUDED.impressions, views = EXCLUDED.views, source = 'manual', note = EXCLUDED.note`
  return NextResponse.json({ ok: true })
}
