import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const companies = await sql`SELECT * FROM companies ORDER BY name`
  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const { name, is_recurring, status, notes } = await req.json()
  const slug = slugify(name)

  const rows = await sql`
    INSERT INTO companies (name, slug, is_recurring, status, notes)
    VALUES (${name}, ${slug}, ${is_recurring ?? false}, ${status ?? 'active'}, ${notes ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
