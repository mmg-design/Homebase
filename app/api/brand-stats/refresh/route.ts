import { NextResponse } from 'next/server'
import { syncBeehiivNewsletter } from '@/lib/beehiiv'
import { syncYouTubeChannel } from '@/lib/youtube'

export async function POST() {
  const results = await Promise.allSettled([syncYouTubeChannel('youtube_mmg'), syncYouTubeChannel('youtube_andy'), syncBeehiivNewsletter()])
  return NextResponse.json({ ok: true, results: results.map(result => result.status === 'fulfilled' ? result.value : { status: 'error', error: String(result.reason) }) })
}
