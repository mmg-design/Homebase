import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { calcStreak } from '@/lib/tracker'

export const dynamic = 'force-dynamic'

const db = () => neon(process.env.DATABASE_URL!)

// Must match the WARM_TYPES keys in rule-of-100-tracker.jsx
const VALID_KEYS = new Set(['email', 'linkedin', 'comment', 'text', 'referral', 'meeting', 'videoDM'])

// Atomically bumps a single outreach field by `value` for the given date.
// Used by the "Rule of 100 Quick Log" browser extension so a tap on
// LinkedIn (or any other tab) can't clobber a concurrent save from the
// open Daily Actions tab — unlike PUT /api/tracker, which overwrites the
// whole counts object.
export async function POST(req: NextRequest) {
  try {
    const { date, key, value } = await req.json()
    if (!date || !key || typeof value !== 'number') {
      return NextResponse.json({ error: 'Missing date, key, or value' }, { status: 400 })
    }
    if (!VALID_KEYS.has(key) || value <= 0 || value > 10) {
      return NextResponse.json({ error: 'Invalid key or value' }, { status: 400 })
    }

    const sql = db()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await sql`
      INSERT INTO daily_tracker (date, counts, cold_sent, minutes, completed, updated_at)
      VALUES (${date}, jsonb_build_object(${key}::text, ${value}::int), false, 0, false, now())
      ON CONFLICT (date) DO UPDATE SET
        counts = jsonb_set(
          daily_tracker.counts,
          ARRAY[${key}::text],
          to_jsonb(COALESCE((daily_tracker.counts->>${key}::text)::int, 0) + ${value}::int)
        ),
        updated_at = now()
      RETURNING counts, minutes
    ` as any[]

    const counts = rows[0].counts as Record<string, number>
    const minutes = rows[0].minutes as number
    const warmTotal = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
    const completed = warmTotal >= 100 || minutes >= 100

    await sql`UPDATE daily_tracker SET completed = ${completed} WHERE date = ${date}`

    if (warmTotal >= 100) {
      await sql`
        INSERT INTO milestones (date, type)
        VALUES (${date}, 'warm')
        ON CONFLICT (date, type) DO NOTHING
      `
    }

    const streak = await calcStreak(sql)
    return NextResponse.json({ ok: true, counts, warmTotal, streak })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
