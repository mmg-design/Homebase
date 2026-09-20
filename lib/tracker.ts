// Shared helpers for the Rule of 100 daily tracker — used by both the
// tracker API route and the increment route (Chrome extension quick-log).

export function getTodayStr() {
  // Use Eastern Time so the day resets at midnight ET, not midnight UTC
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Calculate current streak from history
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calcStreak(sql: any): Promise<number> {
  const rawRows = await sql`
    SELECT date, completed FROM daily_tracker
    WHERE completed = true
    ORDER BY date DESC
    LIMIT 60
  ` as Array<{ date: string | Date; completed: boolean }>
  // The Neon driver returns `date` columns as Date objects, not strings.
  const rows = rawRows.map(row => ({ ...row, date: new Date(row.date).toISOString().slice(0, 10) }))

  if (rows.length === 0) return 0

  const today = getTodayStr()
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  // Streak must include today or yesterday to be active
  const latest = rows[0].date
  if (latest !== today && latest !== yesterday) return 0

  let streak = 0
  let expected = latest

  for (const row of rows) {
    const d = row.date
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
