import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const proposals = await sql`SELECT * FROM proposals ORDER BY created_at DESC`
  return NextResponse.json(proposals)
}

export async function POST(req: NextRequest) {
  const { client_name, stage, total_revenue, weighted_likelihood, notes, contact_name, contact_email, potential_start_date } = await req.json()
  const rows = await sql`
    INSERT INTO proposals (client_name, stage, total_revenue, weighted_likelihood, notes, contact_name, contact_email, potential_start_date)
    VALUES (${client_name}, ${stage || 'interested'}, ${total_revenue || 0}, ${weighted_likelihood || 50}, ${notes || null}, ${contact_name || null}, ${contact_email || null}, ${potential_start_date || null})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
