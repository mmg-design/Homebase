import { NextResponse } from 'next/server'

// Stripe sync disabled — revenue is managed manually via the MMG Master tab
export async function POST() {
  return NextResponse.json({ error: 'Stripe sync is disabled' }, { status: 410 })
}
