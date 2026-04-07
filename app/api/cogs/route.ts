import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: add a cogs_breakdown entry
// Body: { company_id, month, contractor_id, hours, rate }
export async function POST(req: NextRequest) {
  try {
    const { company_id, month, contractor_id, hours, rate } = await req.json()
    if (!company_id || !month || !contractor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const cost = Number(hours) * Number(rate)

    // Get contractor name
    const [contractor] = await sql`SELECT name FROM contractors WHERE id = ${contractor_id}`
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    const [row] = await sql`
      INSERT INTO cogs_breakdown (company_id, month, person_name, contractor_id, hours, rate, cost, source)
      VALUES (${company_id}, ${month}, ${contractor.name}, ${contractor_id}, ${hours}, ${rate}, ${cost}, 'manual')
      RETURNING *
    `
    return NextResponse.json(row)
  } catch (e) {
    console.error('COGS POST error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE: remove a cogs_breakdown entry by id
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await sql`DELETE FROM cogs_breakdown WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('COGS DELETE error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
