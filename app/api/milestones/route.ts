import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const db = sql()
    const rows = await db`
      SELECT id, date, type, reached_at
      FROM milestones
      ORDER BY reached_at DESC
      LIMIT 60
    `
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, type } = await req.json()
    if (!date || !type) return NextResponse.json({ error: 'Missing date or type' }, { status: 400 })
    const db = sql()
    await db`
      INSERT INTO milestones (date, type)
      VALUES (${date}, ${type})
      ON CONFLICT (date, type) DO NOTHING
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
