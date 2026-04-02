import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!)

// ─── CONTRACTORS ────────────────────────────────────────────────────────────
const contractors = [
  { name: 'Roda',             hourly_rate: 8  },
  { name: 'Ali',              hourly_rate: 15 },
  { name: 'Clark',            hourly_rate: 10 },
  { name: 'Anna Andrieieva',  hourly_rate: 12 },
]

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
const clients = [
  { name: 'Singer-Lewak',           slug: 'singer-lewak',          is_recurring: true  },
  { name: 'SL Franchise Group',     slug: 'sl-franchise-group',    is_recurring: true  },
  { name: 'Dirty Money Racing',     slug: 'dirty-money-racing',    is_recurring: true  },
  { name: 'Endurance FP',           slug: 'endurance-fp',          is_recurring: true  },
  { name: 'Stratax',                slug: 'stratax',               is_recurring: true  },
  { name: 'AltSocial Club',         slug: 'altsocial-club',        is_recurring: true  },
  { name: 'Supply Wisdom',          slug: 'supply-wisdom',         is_recurring: true  },
  { name: 'Jennings Exec',          slug: 'jennings-exec',         is_recurring: false },
  { name: 'Vibrix',                 slug: 'vibrix',                is_recurring: true  },
  { name: 'Jeffery Bray',           slug: 'jeffery-bray',          is_recurring: false },
  { name: 'Marysville',             slug: 'marysville',            is_recurring: false },
  { name: 'Kenneth Dev',            slug: 'kenneth-dev',           is_recurring: false },
  { name: 'Exact Medicare',         slug: 'exact-medicare',        is_recurring: true  },
  { name: 'Rocship',                slug: 'rocship',               is_recurring: false },
  { name: '2SP Sports',             slug: '2sp-sports',            is_recurring: false },
  { name: 'Wikifri',                slug: 'wikifri',               is_recurring: false },
  { name: 'Renfroe M&G',            slug: 'renfroe-mg',            is_recurring: false },
  { name: 'GSA',                    slug: 'gsa',                   is_recurring: false },
  { name: 'Jumbo Iced Tea',         slug: 'jumbo-iced-tea',        is_recurring: false },
  { name: 'Huckle',                 slug: 'huckle',                is_recurring: false },
  { name: 'Fluid Minds Consulting', slug: 'fluid-minds-consulting',is_recurring: false },
  { name: 'Stratford Sign Co',      slug: 'stratford-sign-co',     is_recurring: false },
  { name: 'Darwin Research',        slug: 'darwin-research',       is_recurring: false },
  { name: 'Sam Sarsten',            slug: 'sam-sarsten',           is_recurring: false },
  { name: 'The Translation Team',   slug: 'the-translation-team',  is_recurring: false },
  { name: 'MSM Sprint',             slug: 'msm-sprint',            is_recurring: false },
  { name: 'GB Studios',             slug: 'gb-studios',            is_recurring: false },
  { name: 'MyStylistMatch',         slug: 'mystylistmatch',        is_recurring: false },
  { name: 'Belsky Fields Project',  slug: 'belsky-fields-project', is_recurring: false },
]

// ─── HISTORICAL REVENUE (from MMG Master.csv) ────────────────────────────────
// Format: [client_slug, month, amount]
const revenueData: [string, string, number][] = [
  // Singer-Lewak — $1,500/mo Jan25–Mar26
  ['singer-lewak','2025-01',1500],['singer-lewak','2025-02',1500],['singer-lewak','2025-03',1500],
  ['singer-lewak','2025-04',1500],['singer-lewak','2025-05',1500],['singer-lewak','2025-06',1500],
  ['singer-lewak','2025-07',1500],['singer-lewak','2025-08',1500],['singer-lewak','2025-09',1500],
  ['singer-lewak','2025-10',1500],['singer-lewak','2025-11',1500],['singer-lewak','2025-12',1500],
  ['singer-lewak','2026-01',1500],['singer-lewak','2026-02',1500],['singer-lewak','2026-03',1500],

  // SL Franchise Group — $1,750/mo Jan25–Jan26
  ['sl-franchise-group','2025-01',1750],['sl-franchise-group','2025-02',1750],['sl-franchise-group','2025-03',1750],
  ['sl-franchise-group','2025-04',1750],['sl-franchise-group','2025-05',1750],['sl-franchise-group','2025-06',1750],
  ['sl-franchise-group','2025-07',1750],['sl-franchise-group','2025-08',1750],['sl-franchise-group','2025-09',1750],
  ['sl-franchise-group','2025-10',1750],['sl-franchise-group','2025-11',1750],['sl-franchise-group','2025-12',1750],
  ['sl-franchise-group','2026-01',1750],

  // Dirty Money Racing — $650/mo
  ['dirty-money-racing','2025-01',650],['dirty-money-racing','2025-02',650],['dirty-money-racing','2025-03',650],
  ['dirty-money-racing','2025-04',650],['dirty-money-racing','2025-05',650],['dirty-money-racing','2025-06',650],
  ['dirty-money-racing','2025-07',650],['dirty-money-racing','2025-08',650],['dirty-money-racing','2025-09',650],
  ['dirty-money-racing','2025-10',650],['dirty-money-racing','2025-11',650],['dirty-money-racing','2025-12',650],
  ['dirty-money-racing','2026-01',650],['dirty-money-racing','2026-02',650],['dirty-money-racing','2026-03',300],

  // Endurance FP — $498/mo
  ['endurance-fp','2025-01',498],['endurance-fp','2025-02',498],['endurance-fp','2025-03',498],
  ['endurance-fp','2025-04',498],['endurance-fp','2025-05',498],['endurance-fp','2025-06',498],
  ['endurance-fp','2025-07',498],['endurance-fp','2025-08',498],['endurance-fp','2025-09',498],
  ['endurance-fp','2025-10',498],['endurance-fp','2025-11',498],['endurance-fp','2025-12',498],
  ['endurance-fp','2026-01',498],['endurance-fp','2026-02',498],['endurance-fp','2026-03',498],

  // Stratax — $120/mo
  ['stratax','2025-01',120],['stratax','2025-02',120],['stratax','2025-03',120],
  ['stratax','2025-04',120],['stratax','2025-05',120],['stratax','2025-06',120],
  ['stratax','2025-07',120],['stratax','2025-08',120],['stratax','2025-09',120],
  ['stratax','2025-10',120],['stratax','2025-11',120],['stratax','2025-12',120],
  ['stratax','2026-01',120],['stratax','2026-02',120],['stratax','2026-03',120],

  // AltSocial Club
  ['altsocial-club','2025-10',500],['altsocial-club','2025-11',500],['altsocial-club','2025-12',500],
  ['altsocial-club','2026-01',500],['altsocial-club','2026-02',500],['altsocial-club','2026-03',500],

  // Supply Wisdom
  ['supply-wisdom','2026-02',1500],['supply-wisdom','2026-03',1500],

  // Jennings Exec
  ['jennings-exec','2025-07',1250],['jennings-exec','2025-10',1250],['jennings-exec','2026-01',1250],

  // Vibrix (Retainer)
  ['vibrix','2025-06',5693],['vibrix','2025-10',10250],['vibrix','2025-11',10250],
  ['vibrix','2025-12',10250],['vibrix','2026-02',10250],

  // Vibrix (Projects) — rolled into same client
  ['vibrix','2025-04',4575],['vibrix','2025-05',2000],['vibrix','2026-01',125],

  // Jeffery Bray
  ['jeffery-bray','2025-07',2000],

  // Marysville
  ['marysville','2025-12',4800],

  // Kenneth Dev
  ['kenneth-dev','2025-01',2500],['kenneth-dev','2025-02',2500],['kenneth-dev','2025-03',2500],

  // Exact Medicare
  ['exact-medicare','2025-02',1550],['exact-medicare','2025-09',2500],
  ['exact-medicare','2025-12',5000],['exact-medicare','2026-01',3700],
  ['exact-medicare','2026-02',1200],['exact-medicare','2026-03',1200],

  // Rocship
  ['rocship','2025-01',1000],

  // 2SP Sports
  ['2sp-sports','2025-10',2500],['2sp-sports','2025-11',2500],['2sp-sports','2026-03',2500],

  // Wikifri
  ['wikifri','2025-05',1500],['wikifri','2025-06',1687],['wikifri','2025-07',1373],['wikifri','2025-08',725],

  // Renfroe M&G
  ['renfroe-mg','2025-09',2400],

  // GSA
  ['gsa','2025-02',1250],['gsa','2026-01',4000],

  // Jumbo Iced Tea
  ['jumbo-iced-tea','2025-03',840],['jumbo-iced-tea','2025-06',300],

  // Huckle
  ['huckle','2025-07',1500],['huckle','2025-08',1500],

  // Fluid Minds Consulting
  ['fluid-minds-consulting','2025-06',3375],['fluid-minds-consulting','2025-07',1875],
  ['fluid-minds-consulting','2025-08',1000],['fluid-minds-consulting','2025-10',3180],
  ['fluid-minds-consulting','2025-11',1000],['fluid-minds-consulting','2025-12',1000],

  // Stratford Sign Co
  ['stratford-sign-co','2025-06',4000],['stratford-sign-co','2025-11',4000],
  ['stratford-sign-co','2025-12',500],['stratford-sign-co','2026-02',500],

  // Darwin Research
  ['darwin-research','2025-08',7500],['darwin-research','2025-12',7500],['darwin-research','2026-01',600],

  // Sam Sarsten
  ['sam-sarsten','2025-11',1500],['sam-sarsten','2025-12',1869],

  // The Translation Team
  ['the-translation-team','2026-02',6000],

  // MSM Sprint
  ['msm-sprint','2026-02',1500],

  // GB Studios
  ['gb-studios','2026-03',2500],

  // MyStylistMatch
  ['mystylistmatch','2026-03',1500],

  // Belsky Fields Project
  ['belsky-fields-project','2026-03',3000],
]

// ─── EXPENSE TEMPLATES (from transaction history) ────────────────────────────
const expenseTemplates = [
  { line_item: 'Contractor Labor',        default_amount: 0,    sort_order: 1 },
  { line_item: 'Software & Tools',        default_amount: 200,  sort_order: 2 },
  { line_item: 'Advertising & Promotion', default_amount: 0,    sort_order: 3 },
  { line_item: 'Networking & Outreach',   default_amount: 0,    sort_order: 4 },
  { line_item: 'Travel & Meals',          default_amount: 0,    sort_order: 5 },
  { line_item: 'Financial Fees',          default_amount: 0,    sort_order: 6 },
  { line_item: 'Other',                   default_amount: 0,    sort_order: 7 },
]

async function seed() {
  console.log('Seeding contractors...')
  for (const c of contractors) {
    await sql`
      INSERT INTO contractors (name, hourly_rate)
      VALUES (${c.name}, ${c.hourly_rate})
      ON CONFLICT (name) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
    `
  }

  console.log('Seeding clients...')
  const companyIdMap: Record<string, number> = {}
  for (const c of clients) {
    const rows = await sql`
      INSERT INTO companies (name, slug, is_recurring, status)
      VALUES (${c.name}, ${c.slug}, ${c.is_recurring}, 'active')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    companyIdMap[c.slug] = rows[0].id
  }

  console.log('Seeding revenue history...')
  for (const [slug, month, amount] of revenueData) {
    const companyId = companyIdMap[slug]
    if (!companyId) { console.warn(`  ⚠ Unknown slug: ${slug}`); continue }
    await sql`
      INSERT INTO client_financials (company_id, month, category, line_item, actual, source)
      VALUES (${companyId}, ${month}, 'revenue', ${slug}, ${amount}, 'actual')
      ON CONFLICT DO NOTHING
    `
  }

  console.log('Seeding expense templates...')
  for (const t of expenseTemplates) {
    await sql`
      INSERT INTO expense_templates (line_item, default_amount, sort_order)
      VALUES (${t.line_item}, ${t.default_amount}, ${t.sort_order})
      ON CONFLICT (line_item) DO NOTHING
    `
  }

  console.log('Seeding annual goals...')
  await sql`
    INSERT INTO annual_goals (year, revenue_goal, revenue_stretch_goal)
    VALUES (2026, 250000, 300000)
    ON CONFLICT (year) DO UPDATE SET revenue_goal = EXCLUDED.revenue_goal
  `

  console.log('✅ Seed complete.')
}

seed().catch(e => { console.error(e); process.exit(1) })
