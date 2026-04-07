import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )

  const [revenue, cogs, goals] = await Promise.all([
    sql`
      SELECT cf.*, c.name as company_name, c.slug, c.is_recurring
      FROM client_financials cf
      JOIN companies c ON c.id = cf.company_id
      WHERE cf.month = ANY(${months})
        AND cf.category = 'revenue'
      ORDER BY c.name, cf.month
    `,
    sql`
      SELECT cb.*, c.name as company_name, c.slug, co.name as contractor_name
      FROM cogs_breakdown cb
      JOIN companies c ON c.id = cb.company_id
      LEFT JOIN contractors co ON co.id = cb.contractor_id
      WHERE cb.month = ANY(${months})
      ORDER BY c.name, cb.month
    `,
    sql`SELECT * FROM annual_goals WHERE year = ${parseInt(year)}`,
  ])

  const expenses = await sql`
    SELECT * FROM vendor_expenses
    WHERE month = ANY(${months})
    ORDER BY vendor_name, month
  `

  return NextResponse.json({ revenue, cogs, expenses, goals: goals[0] || null })
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, month, category } = body
    const value = body.actual ?? body.budget ?? null

    // Delete ALL existing rows for this cell (clears any duplicates from prior saves)
    await sql`
      DELETE FROM client_financials
      WHERE company_id = ${company_id} AND month = ${month} AND category = ${category}
    `

    // Insert a single clean row
    await sql`
      INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
      VALUES (${company_id}, ${month}, ${category}, 'Revenue', ${value}, 'manual')
    `

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/financials error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
