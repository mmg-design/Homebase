import { NextRequest, NextResponse } from 'next/server'
import { syncYouTubeChannel } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const results = await Promise.allSettled([syncYouTubeChannel('youtube_mmg'), syncYouTubeChannel('youtube_andy')])
  return NextResponse.json({ ok: true, results: results.map(result => result.status === 'fulfilled' ? result.value : { status: 'error', error: String(result.reason) }) })
}
