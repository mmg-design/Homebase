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
  const body = await req.json()
  const { company_id, month, category, actual } = body
  const value = actual ?? body.budget ?? null

  // Find ANY existing row for this company+month+category (ignore line_item)
  const existing = await sql`
    SELECT id FROM client_financials
    WHERE company_id = ${company_id} AND month = ${month} AND category = ${category}
    ORDER BY id LIMIT 1
  `

  if (existing.length > 0) {
    await sql`
      UPDATE client_financials
      SET actual = ${value}, source = 'manual', updated_at = now()
      WHERE id = ${existing[0].id}
    `
  } else {
    await sql`
      INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
      VALUES (${company_id}, ${month}, ${category}, 'Revenue', ${value}, 'manual')
    `
  }

  return NextResponse.json({ ok: true })
}
