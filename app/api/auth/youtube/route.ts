import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/brand-stats'

const validChannels = new Set(['youtube_mmg', 'youtube_andy'])

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel') || ''
  if (!validChannels.has(channel)) return NextResponse.json({ error: 'Unknown YouTube channel.' }, { status: 400 })
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.redirect(new URL('/brand-stats?setup=youtube', request.url))
  const callback = `${getAppUrl()}/api/auth/youtube/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.readonly',
    state: channel,
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
