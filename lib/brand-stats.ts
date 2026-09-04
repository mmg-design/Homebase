import { sql } from '@/lib/db'

export async function ensureBrandStatsTables() {
  await sql`CREATE TABLE IF NOT EXISTS brand_connections (channel_id TEXT PRIMARY KEY, refresh_token TEXT NOT NULL, connected_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`
  await sql`CREATE TABLE IF NOT EXISTS brand_stats (id SERIAL PRIMARY KEY, channel_id TEXT NOT NULL, logged_on DATE NOT NULL, followers INTEGER, impressions INTEGER, views INTEGER, source TEXT NOT NULL DEFAULT 'manual', note TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(channel_id, logged_on))`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_stats_channel_date ON brand_stats(channel_id, logged_on DESC)`
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://homebase-pearl.vercel.app'
}
