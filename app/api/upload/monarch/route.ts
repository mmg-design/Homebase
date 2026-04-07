import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

const BUSINESS_ACCOUNTS = ['MMG Checking', 'MMG Savings', 'MMG Money Market']

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  '(BUSINESS) Software/Tools':          'Software & Tools',
  '(BUSINESS) Contractor Labor':        'Contractor Labor',
  '(BUSINESS) Advertising & Promotion': 'Advertising & Promotion',
  '(BUSINESS) Networking and Outreach': 'Networking & Outreach',
  '(BUSINESS) Travel & Meals':          'Travel & Meals',
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
  const { csv, file_name } = await req.json()
  const rows = parseCSV(csv)

  let inserted = 0
  let skipped = 0
  const warnings: string[] = []

  const bizRows = rows.filter(r => BUSINESS_ACCOUNTS.includes(r['Account']))

  for (const row of bizRows) {
    const date = row['Date']
    if (!date) { skipped++; continue }
    const [yr, mo] = date.split('-')
    if (!yr || !mo) { skipped++; continue }
    const month = `${yr}-${mo}`

    const amount = parseFloat(row['Amount']) || 0
    const category = row['Category']
    const merchant = row['Merchant'] || row['Name'] || 'Unknown'

    const opexCategory = EXPENSE_CATEGORY_MAP[category]
    if (!opexCategory || amount >= 0) { skipped++; continue }

    const absAmount = Math.abs(amount)
    await sql`
      INSERT INTO vendor_expenses (vendor_name, month, planned_amount, actual_amount, category)
      VALUES (${merchant}, ${month}, ${absAmount}, ${absAmount}, ${opexCategory})
      ON CONFLICT (vendor_name, month) DO UPDATE
        SET actual_amount = vendor_expenses.actual_amount + ${absAmount},
            planned_amount = GREATEST(vendor_expenses.planned_amount, ${absAmount}),
            updated_at = now()
    `
    inserted++
  }

  await sql`
    INSERT INTO csv_uploads (csv_type, month, file_name, row_count, warnings)
    VALUES ('monarch', ${new Date().toISOString().slice(0, 7)}, ${file_name}, ${inserted}, ${JSON.stringify(warnings)})
  `

  return NextResponse.json({ inserted, skipped, warnings })
}
