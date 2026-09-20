import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTodayStr, calcStreak } from '@/lib/tracker'

export const dynamic = 'force-dynamic'

const db = () => neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const sql = db()
    const { searchParams } = new URL(req.url)
    const days = searchParams.get('days')

    // History mode: return last N days for the heatmap
    if (days) {
      const n = Math.min(parseInt(days) || 180, 365)
      const rows = await sql`
        SELECT date, counts, cold_sent, minutes, completed
        FROM daily_tracker
        ORDER BY date DESC
        LIMIT ${n}
      ` as any[]
      const normalized = rows.map(r => ({
        ...r,
        date: new Date(r.date).toISOString().slice(0, 10),
      }))
      return NextResponse.json(normalized)
    }

    const date = searchParams.get('date') || getTodayStr()

    const rows = await sql`
      SELECT * FROM daily_tracker WHERE date = ${date}
    ` as any[]

    const streak = await calcStreak(sql)

    if (rows.length === 0) {
      return NextResponse.json({ date, counts: {}, cold_sent: false, minutes: 0, completed: false, streak })
    }

    const dateStr = new Date(rows[0].date).toISOString().slice(0, 10)
    return NextResponse.json({ ...rows[0], date: dateStr, streak })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { date, counts, cold_sent, minutes, completed } = await req.json()
    if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

    const sql = db()

    await sql`
      INSERT INTO daily_tracker (date, counts, cold_sent, minutes, completed, updated_at)
      VALUES (${date}, ${JSON.stringify(counts)}, ${cold_sent}, ${minutes}, ${completed}, now())
      ON CONFLICT (date) DO UPDATE SET
        counts     = EXCLUDED.counts,
        cold_sent  = EXCLUDED.cold_sent,
        minutes    = EXCLUDED.minutes,
        completed  = EXCLUDED.completed,
        updated_at = now()
    `

    const streak = await calcStreak(sql)
    return NextResponse.json({ ok: true, streak })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
