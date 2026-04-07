import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function migrate() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!)
  console.log('Running migrations...')

  await sql`
    CREATE TABLE IF NOT EXISTS contractors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      hourly_rate NUMERIC(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      is_recurring BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','prospect')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS company_contacts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_financials (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      category TEXT NOT NULL,
      line_item TEXT NOT NULL,
      budget NUMERIC(12,2) DEFAULT 0,
      actual NUMERIC(12,2),
      source TEXT DEFAULT 'budget',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_cf_month ON client_financials(month)`
  await sql`CREATE INDEX IF NOT EXISTS idx_cf_company ON client_financials(company_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_cf_category ON client_financials(category)`

  await sql`
    CREATE TABLE IF NOT EXISTS cogs_breakdown (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      person_name TEXT NOT NULL,
      contractor_id INTEGER REFERENCES contractors(id),
      hours NUMERIC(8,2) DEFAULT 0,
      rate NUMERIC(10,2) DEFAULT 0,
      cost NUMERIC(12,2) DEFAULT 0,
      source TEXT DEFAULT 'budget',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_cogs_company_month ON cogs_breakdown(company_id, month)`

  await sql`
    CREATE TABLE IF NOT EXISTS expense_templates (
      id SERIAL PRIMARY KEY,
      line_item TEXT NOT NULL UNIQUE,
      default_amount NUMERIC(12,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS month_status (
      month TEXT PRIMARY KEY,
      status TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
      closed_at TIMESTAMPTZ,
      cash_balance NUMERIC(14,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS csv_uploads (
      id SERIAL PRIMARY KEY,
      csv_type TEXT NOT NULL,
      month TEXT NOT NULL,
      file_name TEXT,
      row_count INTEGER DEFAULT 0,
      raw_data JSONB,
      warnings JSONB DEFAULT '[]',
      errors JSONB DEFAULT '[]',
      uploaded_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS vendor_expenses (
      id SERIAL PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      month TEXT NOT NULL,
      planned_amount NUMERIC(12,2) DEFAULT 0,
      actual_amount NUMERIC(12,2) DEFAULT 0,
      category TEXT DEFAULT 'Software/Tools',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(vendor_name, month)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_ve_month ON vendor_expenses(month)`

  await sql`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      client_name TEXT NOT NULL,
      stage TEXT DEFAULT 'interested' CHECK (stage IN ('interested','proposal','contract')),
      status TEXT DEFAULT 'open' CHECK (status IN ('open','won','lost')),
      open_date DATE DEFAULT CURRENT_DATE,
      close_date DATE,
      total_revenue NUMERIC(12,2) DEFAULT 0,
      total_cogs NUMERIC(12,2) DEFAULT 0,
      potential_start_date DATE,
      weighted_likelihood INTEGER DEFAULT 50,
      length_months INTEGER DEFAULT 1,
      contact_name TEXT,
      contact_email TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS proposal_monthly_cogs (
      id SERIAL PRIMARY KEY,
      proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
      contractor_id INTEGER REFERENCES contractors(id),
      month TEXT NOT NULL,
      hours NUMERIC(8,2) DEFAULT 0,
      rate NUMERIC(10,2) DEFAULT 0,
      cost NUMERIC(12,2) DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS annual_goals (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL UNIQUE,
      revenue_goal NUMERIC(14,2) DEFAULT 0,
      revenue_stretch_goal NUMERIC(14,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS stripe_payments (
      id SERIAL PRIMARY KEY,
      stripe_payment_id TEXT UNIQUE NOT NULL,
      company_id INTEGER REFERENCES companies(id),
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'usd',
      status TEXT,
      description TEXT,
      customer_email TEXT,
      customer_name TEXT,
      month TEXT NOT NULL,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_stripe_month ON stripe_payments(month)`

  await sql`
    CREATE TABLE IF NOT EXISTS moxie_projects (
      id SERIAL PRIMARY KEY,
      moxie_id TEXT UNIQUE NOT NULL,
      company_id INTEGER REFERENCES companies(id),
      name TEXT NOT NULL,
      status TEXT,
      total_value NUMERIC(12,2),
      synced_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('warm','content','cold')),
      reached_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(date, type)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS daily_tracker (
      date DATE NOT NULL PRIMARY KEY,
      counts JSONB NOT NULL DEFAULT '{}',
      cold_sent BOOLEAN NOT NULL DEFAULT false,
      minutes INTEGER NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT false,
      streak INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS expense_line_items (
      id SERIAL PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      month TEXT NOT NULL,
      merchant TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(vendor_name, month, merchant)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_eli_month ON expense_line_items(month)`
  await sql`CREATE INDEX IF NOT EXISTS idx_eli_vendor ON expense_line_items(vendor_name, month)`

  console.log('✅ All migrations complete.')
}

migrate().catch(e => { console.error(e); process.exit(1) })
