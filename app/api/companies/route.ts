import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { ensureCompanyCategories } from '@/lib/companies'

export async function GET() {
  await ensureCompanyCategories()
  const companies = await sql`SELECT * FROM companies ORDER BY name`
  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const { name, is_recurring, status, notes, client_category } = await req.json()
  const slug = slugify(name)
  await ensureCompanyCategories()

  const rows = await sql`
    INSERT INTO companies (name, slug, is_recurring, status, notes, client_category)
    VALUES (${name}, ${slug}, ${is_recurring ?? false}, ${status ?? 'active'}, ${notes ?? null}, ${client_category ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
