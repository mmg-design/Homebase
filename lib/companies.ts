import { sql } from '@/lib/db'

export async function ensureCompanyCategories() {
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS client_category TEXT`
}

export const CLIENT_CATEGORIES = ['website_seo', 'brand_deal'] as const
