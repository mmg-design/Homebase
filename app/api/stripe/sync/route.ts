import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sql } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

export async function POST() {
  const companies = await sql`SELECT id, name, slug FROM companies`

  function matchCompany(description: string, customerName: string, customerEmail: string): number | null {
    const haystack = `${description} ${customerName} ${customerEmail}`.toLowerCase()
    for (const c of companies) {
      const terms = [(c.name as string).toLowerCase(), (c.slug as string).toLowerCase()]
      if (terms.some(t => haystack.includes(t) || t.split(' ').every((w: string) => haystack.includes(w)))) {
        return c.id as number
      }
    }
    return null
  }

  let synced = 0
  let matched = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
    })

    for (const charge of charges.data) {
      if (charge.status !== 'succeeded') continue

      const paidAt = new Date(charge.created * 1000)
      const month = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`
      const amount = charge.amount / 100

      const customerName = (charge.billing_details?.name || '') as string
      const customerEmail = (charge.billing_details?.email || '') as string
      const description = charge.description || ''

      const companyId = matchCompany(description, customerName, customerEmail)
      if (companyId) matched++

      try {
        await sql`
          INSERT INTO stripe_payments (stripe_payment_id, company_id, amount, currency, status, description, customer_name, customer_email, month, paid_at)
          VALUES (${charge.id}, ${companyId}, ${amount}, ${charge.currency}, ${charge.status}, ${description}, ${customerName}, ${customerEmail}, ${month}, ${paidAt.toISOString()})
          ON CONFLICT (stripe_payment_id) DO NOTHING
        `
        synced++

        // If matched, also update client_financials actual
        if (companyId) {
          const existing = await sql`
            SELECT id, actual FROM client_financials
            WHERE company_id = ${companyId} AND month = ${month} AND category = 'revenue'
          `
          if (existing.length > 0) {
            await sql`
              UPDATE client_financials
              SET actual = COALESCE(actual, 0) + ${amount}, source = 'actual', updated_at = now()
              WHERE id = ${existing[0].id}
            `
          } else {
            await sql`
              INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
              VALUES (${companyId}, ${month}, 'revenue', ${String(companyId)}, ${amount}, 'actual')
              ON CONFLICT DO NOTHING
            `
          }
        }
      } catch {
        // duplicate, skip
      }
    }

    hasMore = charges.has_more
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id
    } else {
      hasMore = false
    }
  }

  return NextResponse.json({ synced, matched })
}
