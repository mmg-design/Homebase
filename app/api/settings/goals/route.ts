import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function PUT(req: NextRequest) {
  const { year, revenue_goal, revenue_stretch_goal } = await req.json()
  await sql`
    INSERT INTO annual_goals (year, revenue_goal, revenue_stretch_goal)
    VALUES (${year}, ${revenue_goal}, ${revenue_stretch_goal})
    ON CONFLICT (year) DO UPDATE SET
      revenue_goal = EXCLUDED.revenue_goal,
      revenue_stretch_goal = EXCLUDED.revenue_stretch_goal
  `
  return NextResponse.json({ ok: true })
}
