import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, is_recurring, name, notes } = body

    const rows = await sql`
      UPDATE companies SET
        status       = COALESCE(${status ?? null}, status),
        is_recurring = COALESCE(${is_recurring ?? null}, is_recurring),
        name         = COALESCE(${name ?? null}, name),
        notes        = COALESCE(${notes ?? null}, notes)
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
