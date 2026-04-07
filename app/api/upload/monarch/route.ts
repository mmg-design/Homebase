import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Map Monarch category strings → clean display names
const CATEGORY_MAP: Record<string, string> = {
  '(BUSINESS) Software/Tools':          'Software & Tools',
  '(BUSINESS) Contractor Labor':        'Contractor Labor',
  '(BUSINESS) Advertising & Promotion': 'Advertising & Promotion',
  '(BUSINESS) Networking and Outreach': 'Networking & Outreach',
  '(BUSINESS) Travel & Meals':          'Travel & Meals',
  '(BUSINESS) Rent':                    'Rent',
  '(BUSINESS) Insurance':               'Insurance',
  '(BUSINESS) Utilities & Communication': 'Utilities & Communication',
  '(BUSINESS) Financial Fees':          'Financial Fees',
  'Financial Fees':                     'Financial Fees',
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += ch }
    }
    values.push(current.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
  })
}

export async function POST(req: NextRequest) {
  try {
    const { csv, file_name } = await req.json()
    const rows = parseCSV(csv)

    // Filter: only rows where Category starts with "(BUSINESS)"
    const bizRows = rows.filter(r => r['Category']?.startsWith('(BUSINESS)') || r['Category'] === 'Financial Fees')

    // Group by (cleanCategory, month) → { total, merchants: [{name, amount}] }
    const grouped: Record<string, { total: number; merchants: Array<{ name: string; amount: number }> }> = {}

    for (const row of bizRows) {
      const date = row['Date']
      if (!date) continue
      const [yr, mo] = date.split('-')
      if (!yr || !mo) continue
      const month = `${yr}-${mo}`

      const rawAmount = parseFloat(row['Amount']) || 0
      if (rawAmount === 0) continue  // skip $0 rows (pending/comment rows)

      const rawCategory = row['Category']
      const cleanCategory = CATEGORY_MAP[rawCategory]
      if (!cleanCategory) continue  // skip unmapped categories

      const merchant = row['Merchant'] || 'Unknown'
      // Negative = expense, positive = refund/credit (treat as negative expense)
      const amount = -rawAmount  // flip sign: withdrawals become positive costs

      const key = `${cleanCategory}||${month}`
      if (!grouped[key]) grouped[key] = { total: 0, merchants: [] }
      grouped[key].total += amount
      grouped[key].merchants.push({ name: merchant, amount })
    }

    if (Object.keys(grouped).length === 0) {
      return NextResponse.json({ inserted: 0, skipped: bizRows.length, warnings: ['No matching business expense categories found'] })
    }

    // Collect all months in this upload so we can clear stale data first
    const uploadedMonths = [...new Set(Object.keys(grouped).map(k => k.split('||')[1]))]

    // Clear existing data for these months (clean re-upload)
    await sql`DELETE FROM vendor_expenses WHERE month = ANY(${uploadedMonths})`
    await sql`DELETE FROM expense_line_items WHERE month = ANY(${uploadedMonths})`

    // Insert grouped rows
    let inserted = 0
    for (const [key, { total, merchants }] of Object.entries(grouped)) {
      const [category, month] = key.split('||')
      if (total <= 0) continue  // skip net-zero or net-credit categories

      await sql`
        INSERT INTO vendor_expenses (vendor_name, month, planned_amount, actual_amount, category)
        VALUES (${category}, ${month}, ${total}, ${total}, ${category})
        ON CONFLICT (vendor_name, month) DO UPDATE
          SET actual_amount = ${total},
              planned_amount = ${total},
              updated_at = now()
      `

      // Store merchant breakdown as a separate detail table via JSON column workaround:
      // We use the notes column if it exists, otherwise just rely on a details table.
      // For now store merchants JSON in a csv_uploads row we can join later.
      inserted++

      // Store the per-merchant breakdown for hover tooltips
      await sql`
        INSERT INTO expense_line_items (vendor_name, month, merchant, amount)
        SELECT ${category}, ${month}, m->>'name', (m->>'amount')::numeric
        FROM jsonb_array_elements(${JSON.stringify(merchants)}::jsonb) AS m
      `
    }

    await sql`
      INSERT INTO csv_uploads (csv_type, month, file_name, row_count, warnings)
      VALUES ('monarch', ${uploadedMonths[0]}, ${file_name || 'expenses.csv'}, ${inserted}, '[]')
    `

    return NextResponse.json({ inserted, skipped: bizRows.length - inserted, warnings: [] })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
