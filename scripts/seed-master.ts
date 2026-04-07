import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })
const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!)

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = '', inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseMoney(s: string): number | null {
  if (!s || s === 'X' || s === 'x') return null
  const n = parseFloat(s.replace(/[$,\s]/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

function parseMonthHeader(h: string): string | null {
  const m = h.trim().match(/^(\d{2})\/(\d{2})$/)
  if (!m) return null
  return `20${m[2]}-${m[1]}`
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const RATES: Record<string, number> = { Ali: 15, Clark: 10, Roda: 8, Anna: 12 }

const CODE_MAP: Record<string, string> = {
  SL:       'Singer-Lewak',
  SLFG:     'SL Franchise Group',
  VV:       'Vibrix',
  JES:      'Jennings Exec',
  Darwin:   'Darwin Research',
  SSC:      'Stratford Sign Co',
  DWRG:     'Dirty Money Racing',
  Exact:    'Exact Medicare',
  FMC:      'Fluid Minds Consulting',
  Relyence: 'Relyence',
}

const RECURRING = new Set([
  'Singer-Lewak', 'SL Franchise Group', 'Dirty Money Racing',
  'Endurance FP', 'Stratax', 'AltSocial Club', 'Supply Wisdom',
])

const SKIP_NAMES = new Set(['Totals', 'Probable Revenue', 'Probable Expenses', ''])

async function run() {
  const lines = fs.readFileSync(path.join(process.cwd(), 'MMG Master.csv'), 'utf-8')
    .split('\n').map(l => parseCSVLine(l))

  // Month column indices from header row
  const monthCols: Array<{ col: number; month: string }> = []
  lines[0].forEach((h, i) => { const m = parseMonthHeader(h); if (m) monthCols.push({ col: i, month: m }) })
  console.log(`Months: ${monthCols[0]?.month} → ${monthCols[monthCols.length - 1]?.month}`)

  // Find section boundaries
  let revStart = -1, revEnd = -1, costStart = -1
  lines.forEach((row, i) => {
    const f = row[0]?.trim()
    if (f === 'Actual Revenue') revStart = i + 2
    if (f === 'Actual Cost' && revEnd < 0) { revEnd = i; costStart = i + 2 }
  })

  // ── Clear old CSV data ────────────────────────────────────────────────────
  await sql`DELETE FROM cogs_breakdown WHERE source = 'csv'`
  await sql`DELETE FROM client_financials WHERE source = 'csv'`
  console.log('Cleared old CSV data')

  // ── Companies + Revenue ───────────────────────────────────────────────────
  const companyData: Record<string, Array<{ month: string; amount: number; lineItem: string }>> = {}

  for (let i = revStart; i < revEnd; i++) {
    const row = lines[i]
    const rawName = row[0]?.trim()
    if (!rawName || SKIP_NAMES.has(rawName)) continue

    // Combine Vibrix variants under one company
    const companyName = rawName.startsWith('Vibrix') ? 'Vibrix' : rawName
    const lineItem    = rawName.startsWith('Vibrix') ? rawName : 'Revenue'

    if (!companyData[companyName]) companyData[companyName] = []
    for (const { col, month } of monthCols) {
      const val = parseMoney(row[col])
      if (val) companyData[companyName].push({ month, amount: val, lineItem })
    }
  }

  // Upsert companies
  const companyIdMap: Record<string, number> = {}
  for (const name of Object.keys(companyData)) {
    const rows = await sql`
      INSERT INTO companies (name, slug, is_recurring, status)
      VALUES (${name}, ${slugify(name)}, ${RECURRING.has(name)}, 'active')
      ON CONFLICT (slug) DO UPDATE SET
        name         = EXCLUDED.name,
        is_recurring = EXCLUDED.is_recurring
      RETURNING id
    `
    companyIdMap[name] = rows[0].id as number
  }
  console.log(`Upserted ${Object.keys(companyIdMap).length} companies`)

  // Insert revenue records
  let revCount = 0
  for (const [name, entries] of Object.entries(companyData)) {
    const id = companyIdMap[name]
    if (!id) continue
    for (const { month, amount, lineItem } of entries) {
      await sql`
        INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
        VALUES (${id}, ${month}, 'revenue', ${lineItem}, ${amount}, 'csv')
      `
      revCount++
    }
  }
  console.log(`Inserted ${revCount} revenue records`)

  // ── Contractors ───────────────────────────────────────────────────────────
  const contractorIds: Record<string, number> = {}
  for (const [name, rate] of Object.entries(RATES)) {
    const rows = await sql`
      INSERT INTO contractors (name, hourly_rate, is_active)
      VALUES (${name}, ${rate}, true)
      ON CONFLICT (name) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
      RETURNING id
    `
    contractorIds[name] = rows[0].id as number
  }

  // ── COGS ──────────────────────────────────────────────────────────────────
  let currentContractor: string | null = null
  let cogsCount = 0

  for (let i = costStart; i < lines.length; i++) {
    const row  = lines[i]
    const col0 = row[0]?.trim()
    const col1 = row[1]?.trim()

    if (!col0 && !col1) continue
    if (['Probable Revenue', 'Probable Expenses'].includes(col0)) break

    // Contractor header row
    const cName = Object.keys(RATES).find(c => col0 === c)
    if (cName) { currentContractor = cName; continue }

    // Sub-row: blank col0, client code in col1
    if (!col0 && col1 && currentContractor) {
      if (col1 === 'Internal' || col1 === 'HI' || col1 === 'UCED') continue
      const companyName = CODE_MAP[col1]
      if (!companyName) continue
      const companyId   = companyIdMap[companyName]
      if (!companyId) continue

      const contractorId = contractorIds[currentContractor]
      const rate         = RATES[currentContractor]

      for (const { col, month } of monthCols) {
        const cost = parseMoney(row[col])
        if (!cost) continue
        const hours = rate > 0 ? Math.round((cost / rate) * 10) / 10 : 0
        await sql`
          INSERT INTO cogs_breakdown (company_id, month, person_name, contractor_id, hours, rate, cost, source)
          VALUES (${companyId}, ${month}, ${currentContractor}, ${contractorId}, ${hours}, ${rate}, ${cost}, 'csv')
        `
        cogsCount++
      }
    }
  }
  console.log(`Inserted ${cogsCount} COGS records`)

  // ── Annual goal ───────────────────────────────────────────────────────────
  await sql`
    INSERT INTO annual_goals (year, revenue_goal, revenue_stretch_goal)
    VALUES (2025, 250000, 300000)
    ON CONFLICT (year) DO UPDATE SET revenue_goal = EXCLUDED.revenue_goal
  `
  await sql`
    INSERT INTO annual_goals (year, revenue_goal, revenue_stretch_goal)
    VALUES (2026, 250000, 300000)
    ON CONFLICT (year) DO UPDATE SET revenue_goal = EXCLUDED.revenue_goal
  `
  console.log('✅ Seed complete')
}

run().catch(e => { console.error(e); process.exit(1) })
