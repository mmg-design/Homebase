import { sql } from '@/lib/db'

export const BRAND_CHANNELS = [
  { id: 'youtube_mmg', name: 'MMG Design', platform: 'YouTube', url: 'https://www.youtube.com/@mmgdesign', color: '#ef4444' },
  { id: 'youtube_andy', name: 'Andy the Marketer', platform: 'YouTube', url: 'https://www.youtube.com/@andythemarketer', color: '#ef4444' },
  { id: 'linkedin', name: 'MMG Design', platform: 'LinkedIn', url: 'https://www.linkedin.com/in/mmgdesign/', color: '#0a66c2' },
  { id: 'x', name: 'MMG Design', platform: 'X', url: 'https://x.com/mmg__design', color: '#111827' },
  { id: 'spotify', name: 'The Creative Journal', platform: 'Podcast', url: 'https://open.spotify.com/show/1A2CMXrHEjK4WVLeRzrR0j', color: '#1db954' },
  { id: 'instagram', name: 'Mindful Milligan', platform: 'Instagram', url: 'https://www.instagram.com/mindfulmilligan/', color: '#d946ef' },
  { id: 'columbus_marketers', name: 'Columbus Marketers Community', platform: 'Community', url: null, color: '#0c6b78' },
] as const

export async function ensureBrandStatsTables() {
  await sql`CREATE TABLE IF NOT EXISTS brand_connections (channel_id TEXT PRIMARY KEY, refresh_token TEXT NOT NULL, connected_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`
  await sql`CREATE TABLE IF NOT EXISTS brand_stats (id SERIAL PRIMARY KEY, channel_id TEXT NOT NULL, logged_on DATE NOT NULL, followers INTEGER, impressions INTEGER, views INTEGER, source TEXT NOT NULL DEFAULT 'manual', note TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(channel_id, logged_on))`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_stats_channel_date ON brand_stats(channel_id, logged_on DESC)`
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://homebase-pearl.vercel.app'
}
