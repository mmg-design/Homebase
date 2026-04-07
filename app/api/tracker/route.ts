import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const db = () => neon(process.env.DATABASE_URL!)

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Calculate current streak from history
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calcStreak(sql: any): Promise<number> {
  const rows = await sql`
    SELECT date, completed FROM daily_tracker
    WHERE completed = true
    ORDER BY date DESC
    LIMIT 60
  ` as Array<{ date: string; completed: boolean }>

  if (rows.length === 0) return 0

  const today = getTodayStr()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Streak must include today or yesterday to be active
  const latest = rows[0].date.slice(0, 10)
  if (latest !== today && latest !== yesterday) return 0

  let streak = 0
  let expected = latest

  for (const row of rows) {
    const d = row.date.slice(0, 10)
    if (d === expected) {
      streak++
      const prev = new Date(new Date(expected).getTime() - 86400000)
      expected = prev.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}

export async function GET(req: NextRequest) {
  try {
    const sql = db()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || getTodayStr()

    const rows = await sql`
      SELECT * FROM daily_tracker WHERE date = ${date}
    ` as any[]

    const streak = await calcStreak(sql)

    if (rows.length === 0) {
      return NextResponse.json({ date, counts: {}, cold_sent: false, minutes: 0, completed: false, streak })
    }

    return NextResponse.json({ ...rows[0], date: rows[0].date.slice(0, 10), streak })
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
