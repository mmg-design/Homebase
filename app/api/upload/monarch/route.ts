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
    // Handle quoted fields with commas
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

  // Filter to business accounts only
  const bizRows = rows.filter(r => BUSINESS_ACCOUNTS.includes(r['Account']))

  // Load companies for matching
  const companies = await sql`SELECT id, name, slug FROM companies`

  for (const row of bizRows) {
    const date = row['Date']
    if (!date) { skipped++; continue }
    const [yr, mo] = date.split('-')
    if (!yr || !mo) { skipped++; continue }
    const month = `${yr}-${mo}`

    const amount = parseFloat(row['Amount']) || 0
    const category = row['Category']
    const merchant = row['Merchant']
    const tags = row['Tags'] || ''

    // Revenue (MMG Design category, positive amount)
    if (category === 'MMG Design' && amount > 0) {
      // Try to match to a company via tags
      let companyId: number | null = null

      if (tags) {
        const tagList = tags.split(',').map((t: string) => t.trim().toLowerCase())
        for (const company of companies) {
          const nameLower = (company.name as string).toLowerCase()
          const slugLower = (company.slug as string).toLowerCase()
          if (tagList.some((t: string) => nameLower.includes(t) || t.includes(slugLower) || slugLower.includes(t))) {
            companyId = company.id as number
            break
          }
        }
      }

      if (!companyId) {
        // Try merchant name match
        const merchantLower = merchant.toLowerCase()
        for (const company of companies) {
          const nameLower = (company.name as string).toLowerCase()
          if (nameLower.includes(merchantLower) || merchantLower.includes(nameLower.split(' ')[0])) {
            companyId = company.id as number
            break
          }
        }
      }

      if (companyId) {
        await sql`
          INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
          VALUES (${companyId}, ${month}, 'revenue', ${String(companyId)}, ${amount}, 'actual')
          ON CONFLICT DO NOTHING
        `
        inserted++
      } else {
        warnings.push(`Unmatched revenue: ${merchant} ${date} $${amount} (tags: ${tags})`)
        skipped++
      }
      continue
    }

    // Expenses (negative amounts in business expense categories)
    const expenseCategory = EXPENSE_CATEGORY_MAP[category]
    if (expenseCategory && amount < 0) {
      const absAmount = Math.abs(amount)
      await sql`
        INSERT INTO vendor_expenses (vendor_name, month, planned_amount, actual_amount, category)
        VALUES (${merchant}, ${month}, ${absAmount}, ${absAmount}, ${expenseCategory})
        ON CONFLICT (vendor_name, month) DO UPDATE
          SET actual_amount = vendor_expenses.actual_amount + ${absAmount},
              planned_amount = GREATEST(vendor_expenses.planned_amount, ${absAmount}),
              updated_at = now()
      `
      inserted++
    } else {
      skipped++
    }
  }

  // Log the upload
  await sql`
    INSERT INTO csv_uploads (csv_type, month, file_name, row_count, warnings)
    VALUES ('monarch', ${new Date().toISOString().slice(0, 7)}, ${file_name}, ${inserted}, ${JSON.stringify(warnings)})
  `

  return NextResponse.json({ inserted, skipped, warnings })
}
