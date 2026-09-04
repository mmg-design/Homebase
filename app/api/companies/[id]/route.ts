import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureCompanyCategories } from '@/lib/companies'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, is_recurring, name, notes, client_category } = body

    const slug = name ? slugify(name) : null
    await ensureCompanyCategories()

    const rows = await sql`
      UPDATE companies SET
        status       = COALESCE(${status ?? null}, status),
        is_recurring = COALESCE(${is_recurring ?? null}, is_recurring),
        name         = COALESCE(${name ?? null}, name),
        slug         = COALESCE(${slug}, slug),
        notes        = COALESCE(${notes ?? null}, notes),
        client_category = COALESCE(${client_category ?? null}, client_category)
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
