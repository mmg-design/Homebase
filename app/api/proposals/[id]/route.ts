import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { stage, status, total_revenue, weighted_likelihood, notes, close_date } = body

  await sql`
    UPDATE proposals SET
      stage = COALESCE(${stage || null}, stage),
      status = COALESCE(${status || null}, status),
      total_revenue = COALESCE(${total_revenue ?? null}, total_revenue),
      weighted_likelihood = COALESCE(${weighted_likelihood ?? null}, weighted_likelihood),
      notes = COALESCE(${notes ?? null}, notes),
      close_date = COALESCE(${close_date || null}, close_date),
      updated_at = now()
    WHERE id = ${parseInt(id)}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM proposals WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
