import { NextRequest, NextResponse } from 'next/server'
import { ensureBrandStatsTables, getAppUrl } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

const validChannels = new Set(['youtube_mmg', 'youtube_andy'])

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const channel = request.nextUrl.searchParams.get('state') || ''
  if (!code || !validChannels.has(channel)) return NextResponse.redirect(new URL('/brand-stats?connection=failed', request.url))
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: `${getAppUrl()}/api/auth/youtube/callback`, grant_type: 'authorization_code' }),
  })
  const token = await response.json()
  if (!response.ok || !token.refresh_token) return NextResponse.redirect(new URL('/brand-stats?connection=failed', request.url))
  await ensureBrandStatsTables()
  await sql`INSERT INTO brand_connections (channel_id, refresh_token, updated_at) VALUES (${channel}, ${token.refresh_token}, now()) ON CONFLICT (channel_id) DO UPDATE SET refresh_token = EXCLUDED.refresh_token, updated_at = now()`
  return NextResponse.redirect(new URL('/brand-stats?connection=success', request.url))
}
