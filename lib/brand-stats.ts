import { sql } from '@/lib/db'

export async function ensureBrandStatsTables() {
  await sql`CREATE TABLE IF NOT EXISTS brand_connections (channel_id TEXT PRIMARY KEY, refresh_token TEXT NOT NULL, connected_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`
  await sql`ALTER TABLE brand_connections ADD COLUMN IF NOT EXISTS external_id TEXT`
  await sql`CREATE TABLE IF NOT EXISTS brand_stats (id SERIAL PRIMARY KEY, channel_id TEXT NOT NULL, logged_on DATE NOT NULL, followers INTEGER, impressions INTEGER, views INTEGER, source TEXT NOT NULL DEFAULT 'manual', note TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(channel_id, logged_on))`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_stats_channel_date ON brand_stats(channel_id, logged_on DESC)`
}

type BrandStatInput = { channelId: string; loggedOn: string; followers: number | null; impressions: number | null; views: number | null; source: string; note?: string | null }

export async function saveHighestBrandStat(input: BrandStatInput) {
  await ensureBrandStatsTables()
  const [highest] = await sql`SELECT MAX(followers) AS followers, MAX(impressions) AS impressions, MAX(views) AS views FROM brand_stats WHERE channel_id = ${input.channelId}`
  const clamp = (value: number | null, previous: unknown) => value === null ? null : Math.max(value, Number(previous || 0))
  const followers = clamp(input.followers, highest?.followers)
  const impressions = clamp(input.impressions, highest?.impressions)
  const views = clamp(input.views, highest?.views)
  await sql`INSERT INTO brand_stats (channel_id, logged_on, followers, impressions, views, source, note) VALUES (${input.channelId}, ${input.loggedOn}, ${followers}, ${impressions}, ${views}, ${input.source}, ${input.note || null}) ON CONFLICT (channel_id, logged_on) DO UPDATE SET followers = CASE WHEN EXCLUDED.followers IS NULL THEN brand_stats.followers WHEN brand_stats.followers IS NULL THEN EXCLUDED.followers ELSE GREATEST(brand_stats.followers, EXCLUDED.followers) END, impressions = CASE WHEN EXCLUDED.impressions IS NULL THEN brand_stats.impressions WHEN brand_stats.impressions IS NULL THEN EXCLUDED.impressions ELSE GREATEST(brand_stats.impressions, EXCLUDED.impressions) END, views = CASE WHEN EXCLUDED.views IS NULL THEN brand_stats.views WHEN brand_stats.views IS NULL THEN EXCLUDED.views ELSE GREATEST(brand_stats.views, EXCLUDED.views) END, source = EXCLUDED.source, note = COALESCE(EXCLUDED.note, brand_stats.note)`
  return { followers, impressions, views }
}

export async function normalizeBrandStatHighWaterMarks() {
  await sql`WITH running AS (SELECT id, MAX(followers) OVER (PARTITION BY channel_id ORDER BY logged_on, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS followers, MAX(impressions) OVER (PARTITION BY channel_id ORDER BY logged_on, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS impressions, MAX(views) OVER (PARTITION BY channel_id ORDER BY logged_on, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS views FROM brand_stats) UPDATE brand_stats AS stats SET followers = COALESCE(running.followers, stats.followers), impressions = COALESCE(running.impressions, stats.impressions), views = COALESCE(running.views, stats.views) FROM running WHERE stats.id = running.id`
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://homebase-pearl.vercel.app'
}
