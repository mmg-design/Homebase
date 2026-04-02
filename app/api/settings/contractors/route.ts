import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { name, hourly_rate } = await req.json()
  const rows = await sql`
    INSERT INTO contractors (name, hourly_rate)
    VALUES (${name}, ${hourly_rate})
    ON CONFLICT (name) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
