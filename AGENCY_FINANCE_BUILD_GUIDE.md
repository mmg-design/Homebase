# Agency Financial Dashboard — Build Guide

> **What this is:** A complete, detailed guide for building a financial planning and analysis dashboard for a services/agency business. Hand this file to Claude Code in a fresh repository and say "Read this file and help me build this." It will walk you through everything.
>
> **Origin:** This was reverse-engineered from a production app built for a small agency. The architecture, UI patterns, and business logic have been battle-tested. You're welcome to follow it exactly or adapt it to your needs — the guide will call out decision points along the way.

---

## Table of Contents

1. [Overview & Features](#1-overview--features)
2. [Tech Stack](#2-tech-stack)
3. [Project Setup](#3-project-setup)
4. [Database Schema](#4-database-schema)
5. [Application Structure](#5-application-structure)
6. [Page-by-Page Build Guide](#6-page-by-page-build-guide)
   - [Budget Grid](#61-budget-grid-budget)
   - [Proposals Pipeline](#62-proposals-pipeline-proposals)
   - [Clients](#63-clients-clients)
   - [Upload / Data Ingestion](#64-upload--data-ingestion-upload)
   - [Analysis — Annual](#65-analysis--annual-analysisannual)
   - [Analysis — Monthly](#66-analysis--monthly-analysismonthly)
   - [Settings](#67-settings-settings)
7. [Shared Components & Patterns](#7-shared-components--patterns)
8. [API Routes Reference](#8-api-routes-reference)
9. [Business Logic & Calculations](#9-business-logic--calculations)
10. [Styling & Design System](#10-styling--design-system)
11. [Deployment (Vercel + Neon)](#11-deployment-vercel--neon)
12. [Optional Integrations](#12-optional-integrations)
13. [Seed Data & First Run](#13-seed-data--first-run)
14. [Customization Guide](#14-customization-guide)

---

## 1. Overview & Features

This is a **monthly P&L planning and tracking dashboard** designed for agencies that bill clients for project work and use contractors/employees to deliver it. It answers the core agency finance questions:

- How much revenue am I budgeting per client per month?
- What are my costs (COGS) per client, broken down by contractor?
- What's my gross margin per client and overall?
- What are my operating expenses (rent, software, payroll, etc.)?
- What's my net income after everything?
- How does my budget compare to actuals?
- What's in my sales pipeline, and how does it affect my forecast?
- Which clients are healthy and which are at risk?

### Core Pages

| Page | Purpose |
|------|---------|
| **Budget** | Interactive 12-month P&L grid with revenue, COGS, OpEx, and calculated margins |
| **Proposals** | Sales pipeline tracker (stages: Interested → Proposal → Contract) with "won" conversion to budget |
| **Clients** | Client directory with per-client financial history, contacts, and health metrics |
| **Upload** | Data ingestion — manual entry or CSV import for actuals (timesheets, revenue, expenses) |
| **Analysis (Annual)** | KPI dashboard: GM% by client, contractor variance, expense trends, cash flow, pipeline projections |
| **Analysis (Monthly)** | Single-month deep dive: client performance, risk detection, contractor utilization |
| **Settings** | App configuration, contractor management, annual revenue goals |

### What This Guide Does NOT Include

The original app had two additional sections that are **excluded** from this guide:
- **Todos / Task Management** — A Kanban-style task board with day planner integration
- **Relationships / Reach Outs** — A CRM contact list with AI-powered email drafting

These were removed to keep the build focused on financial planning. If you want to add them later, they're independent features that don't affect the core financial system.

---

## 2. Tech Stack

The recommended stack is below. **You can substitute any of these** — the guide describes the behavior and data structures, so you could swap in Prisma for raw SQL, Zustand for local state, or a different UI library. But if you want to follow along exactly:

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15+ (App Router) | Server components, API routes in one project |
| **Language** | TypeScript | Type safety for financial data is critical |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Rapid UI development, consistent design |
| **Database** | Neon (serverless PostgreSQL) | Free tier is generous, scales well, serverless |
| **Charts** | Recharts | React-native charting, good for financial data |
| **Icons** | Lucide React | Clean, consistent icon set |
| **Fonts** | Google Fonts (your choice) | The original used Quicksand (body) + Unbounded (headings) |
| **Deployment** | Vercel | Zero-config Next.js deployment |

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@neondatabase/serverless": "^0.10.0",
    "recharts": "^3.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.0.0"
  }
}
```

> **Decision point:** You can use any PostgreSQL provider (Supabase, Railway, PlanetScale with MySQL, even SQLite for local dev). Neon is recommended because it has a generous free tier and the `@neondatabase/serverless` driver works great with Vercel edge functions.

---

## 3. Project Setup

### Step 1: Create the project

```bash
npx create-next-app@latest agency-finances --typescript --tailwind --app --src-dir=false
cd agency-finances
```

### Step 2: Install dependencies

```bash
npm install @neondatabase/serverless recharts lucide-react clsx tailwind-merge
npm install -D tsx
```

### Step 3: Add shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: **New York**
- Base color: **Neutral** (or your preference)
- CSS variables: **Yes**

Then add the components you'll need:

```bash
npx shadcn@latest add button dialog input select table tabs badge card dropdown-menu tooltip
```

### Step 4: Set up environment variables

Create `.env.local`:

```env
# Database (Neon — get this from your Neon dashboard)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Optional: Direct connection for migrations (non-pooled)
DATABASE_URL_UNPOOLED=postgresql://user:pass@host/dbname?sslmode=require
```

### Step 5: Create the database client

Create `lib/db.ts`:

```typescript
import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL!)
```

### Step 6: Create utility functions

Create `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `$${n}`
}

export function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${labels[parseInt(m) - 1]} ${y}`
}
```

### Step 7: Set up the dev server

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "migrate": "tsx scripts/migrate.ts",
    "seed": "tsx scripts/seed.ts"
  }
}
```

> **Note:** Port 3001 is arbitrary. Use whatever you prefer.

---

## 4. Database Schema

Create `scripts/migrate.ts`. This is the full schema — run it once with `npm run migrate`.

### Tables Overview

| Table | Purpose |
|-------|---------|
| `contractors` | People who do work (employees, freelancers) with hourly rates |
| `companies` | Your clients |
| `company_contacts` | Contact people at each client company |
| `client_financials` | The main data table — budget and actual values per client/month/category |
| `cogs_breakdown` | Per-contractor cost breakdown for each client/month |
| `expense_templates` | Default OpEx row definitions (your recurring operating costs) |
| `month_status` | Tracks whether a month is open/closed, cash balance, upload timestamps |
| `csv_uploads` | Audit log of CSV imports |
| `vendor_expenses` | Operating expenses by vendor, planned vs actual per month |
| `proposals` | Sales pipeline entries |
| `proposal_monthly_cogs` | Per-contractor COGS breakdown for proposals |
| `annual_goals` | Revenue targets by year |
| `invoices` | Invoice records (optional, for integration with accounting software) |

### Full DDL

```sql
-- Contractors: people who do work for your agency
CREATE TABLE IF NOT EXISTS contractors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies: your clients
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  is_recurring BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','prospect')),
  -- Optional integration IDs (leave null if not using integrations)
  harvest_project_id TEXT,
  qb_customer_name TEXT,
  asana_project_gid TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company contacts: people at each client company
CREATE TABLE IF NOT EXISTS company_contacts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client financials: the core data table
-- Each row = one cell in the budget grid
CREATE TABLE IF NOT EXISTS client_financials (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,              -- Format: "2026-01"
  category TEXT NOT NULL,           -- "revenue", "cogs", or "expense"
  line_item TEXT NOT NULL,          -- Client name (for revenue/cogs) or expense label
  budget NUMERIC(12,2) DEFAULT 0,
  actual NUMERIC(12,2),
  source TEXT DEFAULT 'budget',     -- "budget" or "actual"
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cf_month ON client_financials(month);
CREATE INDEX IF NOT EXISTS idx_cf_company ON client_financials(company_id);
CREATE INDEX IF NOT EXISTS idx_cf_category ON client_financials(category);

-- COGS breakdown: per-contractor detail for each client/month
CREATE TABLE IF NOT EXISTS cogs_breakdown (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  person_name TEXT NOT NULL,
  contractor_id INTEGER REFERENCES contractors(id),
  hours NUMERIC(8,2) DEFAULT 0,
  rate NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,     -- hours * rate (or override)
  source TEXT DEFAULT 'budget',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cogs_company_month ON cogs_breakdown(company_id, month);

-- Expense templates: your default OpEx categories
-- These seed the expense section of the budget grid
CREATE TABLE IF NOT EXISTS expense_templates (
  id SERIAL PRIMARY KEY,
  line_item TEXT NOT NULL UNIQUE,
  default_amount NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Month status: open/closed tracking + metadata
CREATE TABLE IF NOT EXISTS month_status (
  month TEXT PRIMARY KEY,            -- "2026-01"
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at TIMESTAMPTZ,
  cash_balance NUMERIC(14,2),
  harvest_uploaded_at TIMESTAMPTZ,   -- Optional: tracks CSV upload timestamps
  qb_revenue_uploaded_at TIMESTAMPTZ,
  qb_expense_uploaded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CSV uploads: audit trail for data imports
CREATE TABLE IF NOT EXISTS csv_uploads (
  id SERIAL PRIMARY KEY,
  csv_type TEXT NOT NULL,            -- "harvest", "qb_revenue", "qb_expenses"
  month TEXT NOT NULL,
  file_name TEXT,
  row_count INTEGER DEFAULT 0,
  raw_data JSONB,
  warnings JSONB DEFAULT '[]',
  errors JSONB DEFAULT '[]',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor expenses: operating costs by vendor, planned vs actual
CREATE TABLE IF NOT EXISTS vendor_expenses (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  month TEXT NOT NULL,
  planned_amount NUMERIC(12,2) DEFAULT 0,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_name, month)
);
CREATE INDEX IF NOT EXISTS idx_ve_month ON vendor_expenses(month);

-- Proposals: sales pipeline
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
  weighted_likelihood INTEGER DEFAULT 50,  -- 0-100 percent
  length_months INTEGER DEFAULT 1,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Proposal monthly COGS: contractor breakdown per proposal
CREATE TABLE IF NOT EXISTS proposal_monthly_cogs (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id),
  month TEXT NOT NULL,
  hours NUMERIC(8,2) DEFAULT 0,
  rate NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0
);

-- Annual goals: revenue targets
CREATE TABLE IF NOT EXISTS annual_goals (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  revenue_goal NUMERIC(14,2) DEFAULT 0,
  revenue_stretch_goal NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices: optional, for accounting integration
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  invoice_number TEXT,
  amount NUMERIC(12,2),
  date DATE,
  due_date DATE,
  status TEXT DEFAULT 'unpaid',
  external_id TEXT,                  -- ID from accounting software
  payment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_company ON invoices(company_id);
```

### Migration Script Wrapper

```typescript
// scripts/migrate.ts
import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

async function migrate() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!)

  // Paste the DDL above here, executed as a single template literal:
  await sql`CREATE TABLE IF NOT EXISTS contractors (...)`
  // ... etc for each table

  console.log('Migration complete!')
}

migrate().catch(console.error)
```

> **Tip:** You can put all the DDL in a single `sql` call using a multi-statement string, or split them into individual calls. Either works with Neon.

---

## 5. Application Structure

```
app/
  layout.tsx                    # Root layout with sidebar navigation
  page.tsx                      # Redirects to /budget
  globals.css                   # Tailwind + custom theme variables
  budget/
    page.tsx                    # Budget grid page (server component)
  proposals/
    page.tsx                    # Proposals pipeline page
  clients/
    page.tsx                    # Client list page
    [slug]/
      page.tsx                  # Client detail page
  upload/
    page.tsx                    # Data ingestion page
  analysis/
    page.tsx                    # Redirects to /analysis/annual
    annual/
      page.tsx                  # Annual KPI dashboard
    monthly/
      page.tsx                  # Monthly deep-dive
  settings/
    page.tsx                    # Settings & configuration
  api/
    financials/
      route.ts                  # GET/PUT/DELETE budget grid data
      cogs-breakdown/
        route.ts                # GET/PUT COGS contractor breakdown
    companies/
      route.ts                  # GET/POST companies
      [id]/
        route.ts                # GET/PUT/DELETE single company
        contacts/
          route.ts              # GET/POST company contacts
    proposals/
      route.ts                  # GET/POST proposals
      [id]/
        route.ts                # GET/PUT/DELETE single proposal
        win/
          route.ts              # POST — convert won proposal to budget
    upload/
      harvest/
        route.ts                # POST CSV upload for timesheets/COGS
      revenue/
        route.ts                # POST CSV upload for revenue actuals
      expenses/
        route.ts                # POST CSV upload for expense actuals
      history/
        route.ts                # GET upload audit log
    vendor-expenses/
      route.ts                  # GET/PUT/DELETE vendor expenses
      import/
        route.ts                # POST CSV import for vendor expenses
    analysis/
      route.ts                  # GET annual analysis data
      monthly/
        route.ts                # GET single-month analysis data
    annual-goals/
      route.ts                  # GET/PUT annual revenue goals
    month-status/
      route.ts                  # GET/PUT month open/close status
    settings/
      route.ts                  # GET/PUT app settings

components/
  sidebar.tsx                   # Collapsible sidebar navigation
  nav-links.tsx                 # Navigation link definitions

  financials/
    FinancialGrid.tsx           # Main budget grid (the big one)
    GridHeader.tsx              # Month column headers
    GridSection.tsx             # Revenue / COGS / Expenses sections
    GridRow.tsx                 # Individual editable row
    EditableCell.tsx            # Inline-editable cell component
    PnlSummary.tsx              # P&L calculations row
    RevenueGoalBar.tsx          # Stacked revenue progress bar
    AddClientModal.tsx          # Add client to grid
    AddExpenseModal.tsx         # Add expense row
    EditClientModal.tsx         # Edit client details

  proposals/
    ProposalsClient.tsx         # Pipeline table with inline editing
    AddProposalModal.tsx        # New proposal form
    EditProposalModal.tsx       # Edit proposal details
    WonToBudgetModal.tsx        # Convert won proposal → budget rows

  clients/
    ClientListClient.tsx        # Client directory with summary cards
    ClientDetailClient.tsx      # Full client profile + financials
    ContactsSection.tsx         # Contact management
    ClientHealthCard.tsx        # Health indicator sidebar card

  analysis/
    AnalysisClient.tsx          # Annual KPI dashboard
    MonthlyAnalysisClient.tsx   # Monthly deep-dive with risk detection
    VendorExpensesSection.tsx   # Vendor OpEx grid (inline editable)

  upload/
    UploadClient.tsx            # CSV upload form + history

  settings/
    SettingsClient.tsx          # Contractor management + goals

  ui/                           # shadcn/ui primitives (auto-generated)
    button.tsx
    dialog.tsx
    input.tsx
    select.tsx
    table.tsx
    tabs.tsx
    badge.tsx
    card.tsx
    dropdown-menu.tsx
    tooltip.tsx

lib/
  db.ts                         # Neon database client
  types.ts                      # All TypeScript interfaces
  utils.ts                      # Formatting, cn(), helpers
  constants.ts                  # Default values, month labels
  financials.ts                 # Budget grid CRUD + P&L calculations
  proposals.ts                  # Proposal lifecycle management
  analysis.ts                   # Analysis queries + risk detection
  vendor-expenses.ts            # Vendor OpEx CRUD + CSV import
  uploads.ts                    # CSV processing + data matching
  csv-parsers.ts                # Generic CSV parser + format-specific parsers

scripts/
  migrate.ts                    # Database DDL (run once)
  seed.ts                       # Initial data (contractors, expense templates)
```

---

## 6. Page-by-Page Build Guide

### 6.1 Budget Grid (`/budget`)

This is the **heart of the application** — a 12-month interactive P&L spreadsheet.

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Revenue Goal Progress Bar]                                      │
├──────────────┬──────┬──────┬──────┬──────┬─────┬──────┬─────────┤
│  Line Item   │ Jan  │ Feb  │ Mar  │ Apr  │ ... │ Dec  │  Total  │
├──────────────┼──────┼──────┼──────┼──────┼─────┼──────┼─────────┤
│  REVENUE  ▼  │      │      │      │      │     │      │         │
│  Client A    │ $5k  │ $5k  │ $5k  │      │     │      │  $15k   │
│  Client B    │ $3k  │ $3k  │      │      │     │      │  $6k    │
│  + Add Client│      │      │      │      │     │      │         │
├──────────────┼──────┼──────┼──────┼──────┼─────┼──────┼─────────┤
│  COGS  ▼     │      │      │      │      │     │      │         │
│  Client A    │ $2k  │ $2k  │ $2k  │      │     │      │  $6k    │
│    ↳ Dev 1   │ 20h  │ 20h  │ 20h  │      │     │      │         │
│    ↳ Dev 2   │ 10h  │ 10h  │ 10h  │      │     │      │         │
│  Client B    │ $1k  │ $1k  │      │      │     │      │  $2k    │
│  + Add Client│      │      │      │      │     │      │         │
├──────────────┼──────┼──────┼──────┼──────┼─────┼──────┼─────────┤
│  EXPENSES ▼  │      │      │      │      │     │      │         │
│  Payroll     │ $4k  │ $4k  │ $4k  │      │     │      │  $12k   │
│  Software    │ $500 │ $500 │ $500 │      │     │      │  $1.5k  │
│  OpEx (auto) │ $2k  │ $2k  │ $2k  │      │     │      │  $6k    │
│  + Add Row   │      │      │      │      │     │      │         │
├──────────────┼──────┼──────┼──────┼──────┼─────┼──────┼─────────┤
│  P&L SUMMARY │      │      │      │      │     │      │         │
│  Revenue     │ $8k  │ $8k  │ $5k  │      │     │      │  $21k   │
│  COGS        │ $3k  │ $3k  │ $2k  │      │     │      │  $8k    │
│  Gross Margin│ $5k  │ $5k  │ $3k  │      │     │      │  $13k   │
│  GM%         │ 63%  │ 63%  │ 60%  │      │     │      │  62%    │
│  OpEx        │ $6.5k│ $6.5k│ $6.5k│      │     │      │  $19.5k │
│  Net Income  │-$1.5k│-$1.5k│-$3.5k│      │     │      │  -$6.5k │
│  NI%         │ -19% │ -19% │ -70% │      │     │      │  -31%   │
│  Cash Balance│ $50k │ $48.5│ $45k │      │     │      │         │
└──────────────┴──────┴──────┴──────┴──────┴─────┴──────┴─────────┘
```

#### How It Works

**Data Model:** Each cell in the grid maps to a row in `client_financials`:

```typescript
interface FinancialCell {
  budget: number
  actual?: number  // Populated by CSV upload or manual entry
}

interface FinancialRow {
  company_id: number | null   // null for expense rows
  line_item: string           // Display name
  sort_order: number
  values: Record<string, FinancialCell>  // key = "2026-01", "2026-02", etc.
  is_recurring?: boolean
}

interface CogsRow extends FinancialRow {
  has_breakdown?: boolean
  breakdown?: CogsPersonRow[]  // Per-contractor detail
}

interface CogsPersonRow {
  person_name: string
  contractor_id?: number
  values: Record<string, { budget: number; actual?: number }>  // hours values
}
```

**Editable Cells:**
- Click any cell → inline `<input>` appears
- Press Enter/Tab or click away → saves via PUT to `/api/financials`
- State updates optimistically (instant UI feedback)
- Cells show budget value by default; when actuals exist, show both stacked (budget on top in lighter text, actual below)

**Sections:**

1. **Revenue** — One row per active client. Each cell = monthly revenue budget.
2. **COGS** — One row per active client. Expandable to show per-contractor breakdown (hours, rate, cost). The total COGS for a client = sum of all contractor costs.
3. **Expenses** — Your operating costs. These come from two sources:
   - **Manual expense rows** — defined in `expense_templates`, directly editable (e.g., Payroll, Rent, Insurance)
   - **Vendor OpEx auto-sum row** — a read-only row that auto-totals everything from the `vendor_expenses` table (e.g., sum of all your SaaS tools, office costs, etc.)
4. **P&L Summary** — Calculated, never directly edited:
   - Revenue = sum of all revenue rows
   - COGS = sum of all COGS rows
   - Gross Margin = Revenue - COGS
   - GM% = (Gross Margin / Revenue) * 100
   - OpEx = sum of all expense rows
   - Net Income = Gross Margin - OpEx
   - NI% = (Net Income / Revenue) * 100
   - Cash Balance = last known balance + cumulative Net Income (forecast forward)

**COGS Breakdown (Expandable):**
- Click the expand arrow on any COGS row to see per-contractor detail
- Each sub-row shows: contractor name, hours budgeted, hourly rate, calculated cost
- Editing hours or rate recalculates cost automatically
- The parent COGS row total = sum of all contractor costs for that client

**Difference Row:**
- Below Revenue and COGS sections, show a "Difference" row
- Calculates: Actual - Budget for each month (only for months with actuals)
- Color-coded: green = favorable (revenue over budget or COGS under budget), red = unfavorable

**Month Locking:**
- Months can be marked "closed" via `month_status` table
- Closed months render all cells as read-only (no edit affordance)
- Visual indicator (lock icon or muted styling) on closed month columns

**Proposal Overlay:**
- Dropdown to select open proposals
- Selected proposals appear as additional rows in Revenue and COGS sections
- Proposal rows are visually distinct (italic, blue-tinted background, read-only)
- P&L recalculates to include proposal values (helps answer "what if we win this deal?")

**Revenue Goal Bar:**
- Horizontal stacked bar at the top of the page
- Each segment = one client's annual budget (colored uniquely)
- Proposal revenue shown as a separate segment
- Vertical line markers for annual goal and stretch goal
- Tooltip on hover shows client name + annual budget amount

**Add Client:**
- Modal to select an existing company or create new
- Adds a row to both Revenue and COGS sections
- Initializes all months with $0 budget

**Add Expense:**
- Modal to name a new expense category
- Adds a row to the Expenses section

#### Key Library: `lib/financials.ts`

```typescript
// Core function signatures:

export async function getFinancialGrid(startMonth: string, endMonth: string): Promise<FinancialGridData>
// Builds the full grid from DB. Queries client_financials, cogs_breakdown,
// month_status, companies. Groups rows by category. Computes P&L.

export async function updateFinancial(
  companyId: number | null, month: string, category: string,
  lineItem: string, amount: number, source?: string
): Promise<void>
// Upserts a single cell value. Used for both budget and actual updates.

export async function updateCogsBreakdown(
  companyId: number, month: string, personName: string,
  hours: number, rate: number, contractorId?: number
): Promise<void>
// Upserts a contractor's hours/rate for a specific client/month.
// Recalculates cost = hours * rate.

export async function addClientToGrid(companyId: number): Promise<void>
// Creates initial $0 rows in revenue + COGS for all months.

export async function removeClientFromGrid(companyId: number): Promise<void>
// Deletes all client_financials and cogs_breakdown rows for a company.

export async function getContractors(activeOnly?: boolean): Promise<Contractor[]>
export async function getCompanies(status?: string): Promise<Company[]>
```

---

### 6.2 Proposals Pipeline (`/proposals`)

A table-based sales pipeline tracker.

#### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Pipeline Value: $125,000 weighted                    [+ Add Proposal] │
├──────────────┬───────┬──────────┬─────────┬────────┬──────┬───────────┤
│  Client      │ Stage │ Revenue  │ COGS    │ Like.  │ Start│ Actions   │
├──────────────┼───────┼──────────┼─────────┼────────┼──────┼───────────┤
│  Acme Corp   │ ●Prop │ $50,000  │ $20,000 │ 75%    │ Apr  │ ✏ 🗑 ✓   │
│  Beta Inc    │ ●Int  │ $30,000  │ $12,000 │ 25%    │ May  │ ✏ 🗑 ✓   │
│  Gamma LLC   │ ●Cont │ $80,000  │ $35,000 │ 90%    │ Mar  │ ✏ 🗑 ✓   │
├──────────────┴───────┴──────────┴─────────┴────────┴──────┴───────────┤
│  ▶ Closed (2 won, 1 lost)                                             │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface Proposal {
  id: number
  company_id?: number          // Links to companies table (optional)
  client_name: string          // Display name (may not be an existing client)
  stage: 'interested' | 'proposal' | 'contract'
  status: 'open' | 'won' | 'lost'
  open_date: string            // ISO date
  close_date?: string
  total_revenue: number
  total_cogs: number
  potential_start_date?: string
  weighted_likelihood: number  // 0-100
  length_months: number
  contact_name?: string
  contact_email?: string
  notes?: string
}
```

#### Features

- **Inline editing** — Most fields are editable directly in the table row (click to edit, blur to save)
- **Stage colors** — Each stage gets a distinct color dot (e.g., blue=Interested, orange=Proposal, green=Contract)
- **Weighted pipeline value** — Header shows sum of (revenue * likelihood%) for all open proposals
- **Mark as Won** — Opens the WonToBudgetModal:
  - Select start month and duration (number of months)
  - Define per-contractor COGS allocation per month
  - On confirm: creates the company (if new), adds revenue + COGS rows to the budget grid
- **Mark as Lost** — Sets status to "lost", moves to closed section
- **Closed section** — Collapsible, shows historical won/lost deals
- **Proposal Overlay** — Won/active proposals can be overlaid on the Budget grid (see 6.1)

#### Key Library: `lib/proposals.ts`

```typescript
export async function getProposals(status?: string): Promise<Proposal[]>
export async function createProposal(data: Partial<Proposal>): Promise<Proposal>
export async function updateProposal(id: number, data: Partial<Proposal>): Promise<void>
export async function deleteProposal(id: number): Promise<void>
export async function markProposalWon(id: number): Promise<void>

// The big one: converts a won proposal into budget grid rows
export async function recordProposalWonToBudget(
  proposalId: number,
  startMonth: string,
  contractors: Array<{ contractorId: number; month: string; hours: number; rate: number }>
): Promise<void>
// 1. Creates company if needed
// 2. Creates revenue rows (total_revenue / length_months per month)
// 3. Creates COGS rows from contractor allocations
// 4. Updates proposal status to "won"
```

---

### 6.3 Clients (`/clients`)

A directory of all your client companies with per-client financial detail.

#### Client List Page

```
┌──────────────────────────────────────────────────────────────┐
│  [All] [Active] [Inactive]              [+ New Client]       │
├──────────────────────────────────────────────────────────────┤
│  Summary: 8 active clients | $32k MRR | Avg GM 58%          │
├───────────────┬────────┬─────────┬──────┬────────┬──────────┤
│  Client       │ Status │ Revenue │ GM%  │ Contact│ Tasks    │
├───────────────┼────────┼─────────┼──────┼────────┼──────────┤
│  Acme Corp    │ Active │ $5,000  │ 62%  │ Jane D │ 3 open   │
│  Beta Inc     │ Active │ $3,200  │ 55%  │ Bob S  │ 1 open   │
└───────────────┴────────┴─────────┴──────┴────────┴──────────┘
```

**Features:**
- Tab filter: All / Active / Inactive
- Sortable columns (name, status, revenue, GM%, tasks)
- Summary cards at top (active count, MRR, avg GM%)
- Click client name → navigates to detail page

#### Client Detail Page

```
┌─────────────────────────────────────┬────────────────────────┐
│  ACME CORP                          │  Health: Good (62% GM) │
│                                     │                        │
│  [Revenue & Margin Chart - 12mo]    │  Status: Active        │
│  ████████████████████████████        │  Type: Retainer        │
│                                     │                        │
│  Financial History Table             │  Primary Contact:      │
│  ┌──────┬────────┬──────┬─────┐     │  Jane Doe              │
│  │ Month│ Rev    │ COGS │ GM% │     │  jane@acme.com         │
│  │ Jan  │ $5,000 │$2,000│ 60% │     │                        │
│  │ Feb  │ $5,000 │$1,800│ 64% │     │  Invoices:             │
│  └──────┴────────┴──────┴─────┘     │  #1042 - $5,000 (Paid) │
│                                     │  #1089 - $5,000 (Due)  │
│  COGS Breakdown                     │                        │
│  Dev 1: 20h @ $90/h = $1,800       │  Notes:                │
│  Dev 2: 10h @ $65/h = $650         │  [editable textarea]   │
└─────────────────────────────────────┴────────────────────────┘
```

**Left column (2/3 width):**
- Revenue & Margin trend chart (ComposedChart: bars for revenue, line for GM%)
- Timeframe selector (12mo / 24mo / 36mo)
- Financial history table (month-by-month: budget rev, actual rev, COGS, GM%)
- COGS breakdown by contractor (hours, rate, cost per person)

**Right column (1/3 width):**
- Client health card (GM% indicator with color coding)
- Status dropdown (active/inactive/prospect)
- Recurring toggle
- Contacts section (add/edit/remove contacts)
- Invoice list (if using accounting integration)
- Notes textarea (auto-saves on blur)

---

### 6.4 Upload / Data Ingestion (`/upload`)

This page lets you import actual financial data. **The simplest approach is manual entry directly in the budget grid** (just click a cell and type the actual value). But if you want bulk imports, this page handles CSV uploads.

#### Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Upload Actuals                           Month: [March 2026] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Timesheet / COGS Actuals ──────────────────────────────┐  │
│  │  Upload a CSV of contractor hours and costs per client.  │  │
│  │  [Choose File] or drag & drop          [Upload]         │  │
│  │                                                         │  │
│  │  Expected columns: Client, Person, Hours, Rate, Cost    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Revenue Actuals ──────────────────────────────────────┐   │
│  │  Upload a CSV of invoiced revenue per client.           │  │
│  │  [Choose File] or drag & drop          [Upload]        │   │
│  │                                                        │   │
│  │  Expected columns: Client, Amount                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Expense Actuals ─────────────────────────────────────┐    │
│  │  Upload a CSV of operating expenses.                   │   │
│  │  [Choose File] or drag & drop          [Upload]       │    │
│  │                                                       │    │
│  │  Expected columns: Vendor/Category, Amount            │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Cash Balance ────────────────────────────────────────┐    │
│  │  End-of-month cash balance: [$ ________]   [Save]     │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  Upload History                                               │
│  ┌──────────┬──────────┬──────┬──────┬─────────────────────┐  │
│  │ Date     │ Type     │ Month│ Rows │ Warnings            │  │
│  │ Mar 5    │ COGS     │ Feb  │ 45   │ 1 unmatched client  │  │
│  │ Mar 5    │ Revenue  │ Feb  │ 12   │ None                │  │
│  └──────────┴──────────┴──────┴──────┴─────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

#### CSV Formats

**Timesheet / COGS CSV:**

| Client | Person | Hours | Rate | Cost |
|--------|--------|-------|------|------|
| Acme Corp | John Smith | 20 | 90.00 | 1800.00 |
| Acme Corp | Jane Doe | 15 | 65.00 | 975.00 |
| Beta Inc | John Smith | 10 | 90.00 | 900.00 |

Processing:
- Groups by client → writes actual COGS to `client_financials`
- Groups by client + person → writes to `cogs_breakdown`
- Matches client names to `companies.name` (case-insensitive)
- Unmatched clients trigger a warning + mapping dialog

**Revenue CSV:**

| Client | Amount |
|--------|--------|
| Acme Corp | 5000.00 |
| Beta Inc | 3200.00 |

Processing:
- Writes actual revenue to `client_financials` for each matched client

**Expense CSV:**

| Category | Amount |
|----------|--------|
| AWS | 450.00 |
| Figma | 75.00 |
| Office Rent | 2000.00 |

Processing:
- Writes actual amounts to `vendor_expenses` table

> **Decision point:** The CSV formats above are simplified. The original app parsed Harvest and QuickBooks export formats specifically (with header/footer stripping). If you use specific tools, you may need to adjust the parser. The generic format above works for manual exports from any system.

#### Unmatched Client Handling

When a CSV contains a client name that doesn't match any company in the database:
1. Show a mapping dialog listing all unmatched names
2. For each, offer: dropdown to match to existing company, or "Create New" button
3. "Skip" option to ignore that row
4. Re-process after mapping

#### Key Library: `lib/csv-parsers.ts`

```typescript
// Generic CSV parser (handles quoted fields, commas in values)
export function parseCsvText(text: string): string[][]

// Timesheet parser
export function parseTimesheetCsv(text: string, companyNames: string[]): {
  byClient: Record<string, number>           // client → total cost
  byClientPerson: Record<string, Record<string, { hours: number; cost: number; rate: number }>>
  unmatchedClients: string[]
}

// Revenue parser
export function parseRevenueCsv(text: string, companyNames: string[]): {
  byClient: Record<string, number>           // client → total revenue
  unmatchedClients: string[]
}

// Expense parser
export function parseExpenseCsv(text: string): {
  byCategory: Record<string, number>         // category → total amount
}
```

---

### 6.5 Analysis — Annual (`/analysis/annual`)

A KPI dashboard for the full fiscal year.

#### Sections

**1. Metric Cards (top row, 4 cards):**

| Card | Value | Subtext |
|------|-------|---------|
| Budget Revenue | $350,000 | YTD actual: $125,000 |
| Budget GM% | 58% | YTD actual: 61% |
| Pipeline (Weighted) | $85,000 | 3 open proposals |
| Cash Balance | $52,000 | As of Feb 2026 |

**2. Client Gross Margins Table:**

| Client | Budget Rev | Actual Rev | Budget COGS | Actual COGS | Budget GM% | Actual GM% | Flag |
|--------|-----------|------------|------------|-------------|-----------|------------|------|
| Acme Corp | $60,000 | $22,000 | $24,000 | $8,500 | 60% | 61% | |
| Beta Inc | $36,000 | $9,600 | $18,000 | $5,100 | 50% | 47% | ! |

Flag = GM% below threshold (default 55%).

**3. Contractor Hours Variance Table:**

| Client | Contractor | Budget Hours | Actual Hours | Variance | Var% |
|--------|-----------|-------------|-------------|----------|------|
| Acme | John S | 80 | 72 | -8 | -10% |
| Acme | Jane D | 60 | 65 | +5 | +8% |

**4. Monthly Expenses Chart (Recharts bar chart):**
- X-axis: months
- Y-axis: dollar amount
- Two bars per month: budget (blue) vs actual (orange)

**5. Cash Balance Trend Chart (Recharts line chart):**
- X-axis: months
- Y-axis: dollar amount
- Line shows actual cash balance where recorded, forecast where not

**6. Pipeline Revenue Projection Table:**
- Shows open proposals distributed across their potential months
- Weighted by likelihood percentage

**7. Vendor OpEx Detail Section:**
- Editable grid of vendor expenses by month
- Columns: Vendor name, Jan, Feb, Mar, ... Dec, Total
- Each cell shows planned amount (editable inline)
- "Add Vendor" row at bottom
- "Import CSV" button for bulk entry
- Delete vendor button (trash icon) per row

**CSV Import Format for Vendor Expenses:**

```csv
Vendor,Jan 2026,Feb 2026,Mar 2026,...
AWS,1000,1000,1000,...
Figma,75,75,75,...
Office Rent,2000,2000,2000,...
```

#### Key Library: `lib/analysis.ts`

```typescript
interface AnalysisData {
  total_budget_revenue: number
  total_actual_revenue: number
  total_budget_gm_pct: number
  total_actual_gm_pct: number
  total_pipeline_weighted: number
  latest_cash_balance: number | null
  client_gm: ClientGmAnalysis[]
  contractor_variance: ContractorVariance[]
  expense_trends: ExpenseTrend[]
  cash_trend: CashTrend[]
  pipeline_projection: PipelineProjection[]
  vendor_expenses: VendorExpenseData
}

export async function getAnalysisData(startMonth: string, endMonth: string): Promise<AnalysisData>
```

---

### 6.6 Analysis — Monthly (`/analysis/monthly`)

A deep dive into a single month's performance.

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Month: [February 2026 ▼]    (only months with actuals shown)  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Client Performance Table                                      │
│  ┌────────┬────────┬────────┬───────┬──────┬──────┬──────────┐ │
│  │ Client │Bud Rev │Act Rev │ Hours │ COGS │ $/hr │ GM%      │ │
│  │ Acme   │ $5,000 │ $5,200 │ 30    │$2,100│ $173 │ 60% ●   │ │
│  │ Beta   │ $3,200 │ $3,000 │ 22    │$1,500│ $136 │ 50% ●   │ │
│  └────────┴────────┴────────┴───────┴──────┴──────┴──────────┘ │
│                                                                │
│  Hover on hours → tooltip: "John: 20h, Jane: 10h"             │
│                                                                │
│  Client Risks                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Beta Inc:  ⚠ GM trending down (3 months)                 │  │
│  │ Beta Inc:  ⚠ Contractor concentration (John = 80%)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Revenue Concentration (stacked bar chart)                      │
│  ████ Acme 40% ████ Beta 25% ████ Gamma 20% ████ Other 15%   │
│                                                                │
│  Contractor Utilization Table                                  │
│  ┌──────────┬────────┬──────┬──────┬──────────────────────┐   │
│  │ Person   │ Client │ Hours│ Cost │ Projects             │   │
│  │ John S   │ (all)  │ 52   │$4,680│ Acme(20), Beta(22)  │   │
│  │ Jane D   │ (all)  │ 25   │$1,625│ Acme(10), Gamma(15) │   │
│  └──────────┴────────┴──────┴──────┴──────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

#### Risk Detection Logic

The monthly analysis automatically flags client risks:

```typescript
// Hours trend: compare last 3 months of hours
if (current_hours > prev_month * 1.2 && prev_month > prev_prev * 1.2) {
  flag: "Hours trending up — scope creep?"
}

// GM trend: declining GM% over 3 months
if (current_gm_pct < prev_gm_pct && prev_gm_pct < prev_prev_gm_pct) {
  flag: "GM% trending down"
}

// Contractor concentration: one person > 35% of total hours
if (person_hours / total_hours > 0.35) {
  flag: "Contractor concentration risk"
}
```

---

### 6.7 Settings (`/settings`)

Configuration page for the app.

#### Sections

**1. Contractors:**
- Table: Name, Hourly Rate, Active (toggle)
- Add new contractor form
- Edit existing (inline or modal)

**2. Annual Goals:**
- Revenue Goal (editable)
- Stretch Revenue Goal (editable)
- Year selector

**3. Expense Templates:**
- List of default OpEx categories
- Add/remove/edit
- These seed the Expenses section of the budget grid for new months

**4. Integration Status (optional):**
- Show connected/disconnected status for any integrations
- Configuration fields for API keys or OAuth

---

## 7. Shared Components & Patterns

### EditableCell

The most-used component in the app. An inline-editable table cell.

```typescript
interface EditableCellProps {
  value: number
  actual?: number          // If present, show budget + actual stacked
  onChange: (newValue: number) => void
  readonly?: boolean       // For closed months or calculated rows
  format?: 'currency' | 'percent' | 'hours'
}
```

**Behavior:**
- Default state: displays formatted value as text
- Click → transforms into `<input type="number">`
- Enter/Tab → saves, moves to next cell
- Escape → cancels edit, reverts to original
- Blur → saves
- When `actual` is present: show budget in lighter/smaller text above, actual in bold below

### Sidebar Navigation

Collapsible sidebar with sections:

```
Finance
  ├── Budget
  ├── Proposals
  ├── Upload
  └── Analysis
        ├── Annual
        └── Monthly

Clients
  └── All Clients

⚙ Settings (bottom)
```

Features:
- Collapse to icon-only mode
- Active route highlighting
- Nested items with expand/collapse
- Hover tooltips in collapsed mode

### Modal Pattern

All modals use shadcn/ui Dialog:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Client</DialogTitle>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Data Fetching Pattern

Pages use server components to fetch initial data, then pass to client components:

```tsx
// app/budget/page.tsx (server component)
export default async function BudgetPage() {
  const data = await getFinancialGrid('2026-01', '2026-12')
  const proposals = await getProposals('open')
  const goals = await getAnnualGoals(2026)
  return <FinancialGrid initialData={data} proposals={proposals} goals={goals} />
}

// components/financials/FinancialGrid.tsx (client component)
'use client'
export function FinancialGrid({ initialData, proposals, goals }: Props) {
  const [data, setData] = useState(initialData)
  // ... interactive UI
}
```

Updates happen client-side via fetch to API routes, with optimistic state updates.

---

## 8. API Routes Reference

### Financial Grid

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/financials?start_month=2026-01&end_month=2026-12` | — | Fetch full grid |
| PUT | `/api/financials` | `{ company_id, month, category, line_item, amount, source? }` | Update cell |
| DELETE | `/api/financials` | `{ category: "expense", line_item }` | Remove expense row |

### COGS Breakdown

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/financials/cogs-breakdown?company_id=1&month=2026-01` | — | Get contractor detail |
| PUT | `/api/financials/cogs-breakdown` | `{ company_id, month, person_name, hours, rate, contractor_id? }` | Update contractor row |

### Companies

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/companies?status=active` | — | List companies |
| POST | `/api/companies` | `{ name, status?, is_recurring? }` | Create company |
| GET | `/api/companies/[id]` | — | Get company detail |
| PUT | `/api/companies/[id]` | `{ name?, status?, notes?, ... }` | Update company |
| DELETE | `/api/companies/[id]` | — | Delete company |

### Company Contacts

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/companies/[id]/contacts` | — | List contacts |
| POST | `/api/companies/[id]/contacts` | `{ name, email?, phone?, role?, is_primary? }` | Add contact |

### Proposals

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/proposals?status=open` | — | List proposals |
| POST | `/api/proposals` | `{ client_name, total_revenue, total_cogs, ... }` | Create |
| GET | `/api/proposals/[id]` | — | Get single |
| PUT | `/api/proposals/[id]` | Partial update fields | Update |
| DELETE | `/api/proposals/[id]` | — | Delete |
| POST | `/api/proposals/[id]/win` | `{ start_month, contractors: [...] }` | Convert to budget |

### Upload / Data Ingestion

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `/api/upload/harvest` | FormData: `month`, `file` | Upload timesheet CSV |
| POST | `/api/upload/revenue` | FormData: `month`, `file` | Upload revenue CSV |
| POST | `/api/upload/expenses` | FormData: `month`, `file` | Upload expense CSV |
| GET | `/api/upload/history?month=2026-02` | — | Get upload audit log |

### Vendor Expenses

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/vendor-expenses?start=2026-01&end=2026-12` | — | Get all vendor expenses |
| PUT | `/api/vendor-expenses` | `{ vendor_name, month, planned_amount }` | Upsert vendor expense |
| DELETE | `/api/vendor-expenses` | `{ vendor_name }` | Delete vendor |
| POST | `/api/vendor-expenses/import` | `{ csv_text, type: "planned" \| "actual" }` | CSV import |

### Analysis

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/analysis?start=2026-01&end=2026-12` | — | Annual analysis data |
| GET | `/api/analysis/monthly?month=2026-02` | — | Single month analysis |

### Other

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/api/annual-goals?year=2026` | — | Get revenue goals |
| PUT | `/api/annual-goals` | `{ year, revenue_goal, revenue_stretch_goal }` | Set goals |
| GET | `/api/month-status?month=2026-02` | — | Get month status |
| PUT | `/api/month-status` | `{ month, status?, cash_balance?, ... }` | Update month |

---

## 9. Business Logic & Calculations

### P&L Calculations

These run client-side after any cell update:

```typescript
function computePnl(revenue: FinancialRow[], cogs: CogsRow[], expenses: FinancialRow[], months: string[]): {
  monthly: Record<string, PnlRow>
  ytd: PnlRow
} {
  const monthly: Record<string, PnlRow> = {}
  let ytdRev = 0, ytdCogs = 0, ytdOpex = 0

  for (const month of months) {
    const rev = revenue.reduce((sum, row) => sum + (row.values[month]?.budget || 0), 0)
    const cog = cogs.reduce((sum, row) => sum + (row.values[month]?.budget || 0), 0)
    const opex = expenses.reduce((sum, row) => sum + (row.values[month]?.budget || 0), 0)

    const gm = rev - cog
    const ni = gm - opex

    monthly[month] = {
      revenue: rev,
      cogs: cog,
      gm,
      gm_pct: rev > 0 ? (gm / rev) * 100 : 0,
      opex,
      ni,
      ni_pct: rev > 0 ? (ni / rev) * 100 : 0,
    }

    ytdRev += rev
    ytdCogs += cog
    ytdOpex += opex
  }

  const ytdGm = ytdRev - ytdCogs
  const ytdNi = ytdGm - ytdOpex

  return {
    monthly,
    ytd: {
      revenue: ytdRev,
      cogs: ytdCogs,
      gm: ytdGm,
      gm_pct: ytdRev > 0 ? (ytdGm / ytdRev) * 100 : 0,
      opex: ytdOpex,
      ni: ytdNi,
      ni_pct: ytdRev > 0 ? (ytdNi / ytdRev) * 100 : 0,
    }
  }
}
```

### Cash Balance Forecasting

The P&L summary row shows cash balance:
1. Find the latest month with a recorded `cash_balance` in `month_status`
2. Use that as the anchor point
3. For future months, forecast: `previous_month_cash + net_income`
4. Display actual values in normal text, forecasted values in italic/gray

### Weighted Pipeline Value

```typescript
const weightedPipeline = proposals
  .filter(p => p.status === 'open')
  .reduce((sum, p) => sum + (p.total_revenue * p.weighted_likelihood / 100), 0)
```

### COGS Breakdown → Total

When a COGS row has contractor breakdown:
```typescript
const totalCogs = breakdown.reduce((sum, person) => {
  return sum + (person.hours * person.rate)
}, 0)
```

This total is what appears in the parent COGS row cell.

### Effective Hourly Rate (Monthly Analysis)

```typescript
const effectiveRate = totalRevenue / totalHours  // Revenue per hour of work
// Useful for comparing: are some clients more profitable per hour than others?
```

---

## 10. Styling & Design System

### Color Palette

Define these as CSS variables in `globals.css`:

```css
:root {
  --primary: #f97316;           /* Orange — accent, active states, buttons */
  --primary-hover: #ea580c;
  --background: #f8fafc;        /* Light slate — page background */
  --foreground: #1e293b;        /* Dark slate — primary text */
  --muted: #64748b;             /* Slate — secondary text */
  --muted-bg: #f1f5f9;         /* Light slate — muted backgrounds */
  --border: #e2e8f0;            /* Slate — borders */
  --success: #22c55e;           /* Green — positive values, good GM% */
  --danger: #ef4444;            /* Red — negative values, warnings */
  --warning: #f59e0b;           /* Amber — caution indicators */
  --info: #3b82f6;              /* Blue — informational, budget values */

  /* P&L Summary row */
  --pnl-bg: #1e293b;           /* Dark header */
  --pnl-text: #ffffff;

  /* Proposal overlay */
  --proposal-bg: #eff6ff;      /* Light blue tint */
  --proposal-text: #3b82f6;

  /* Chart colors (for stacked bars, pie charts, etc.) */
  --chart-1: #f97316;
  --chart-2: #3b82f6;
  --chart-3: #22c55e;
  --chart-4: #a855f7;
  --chart-5: #06b6d4;
}
```

> **Decision point:** The orange primary is the original design. Feel free to change this to match your brand.

### Typography

```css
body {
  font-family: 'Quicksand', system-ui, sans-serif;  /* Or your preferred body font */
  font-size: 14px;
  line-height: 1.5;
}

h1, h2, h3, h4 {
  font-family: 'Unbounded', system-ui, sans-serif;  /* Or your preferred heading font */
}
```

### Grid Styling

- **Table cells:** Compact padding (`px-2 py-1.5`), right-aligned numbers
- **Header row:** Sticky, light gray background, bold month labels
- **Section headers:** Gray background, collapsible with chevron icon
- **Editable cells:** Show subtle border on hover, input appears on click
- **Read-only cells:** No hover effect, slightly muted text
- **Actual values:** When both budget and actual exist, budget appears smaller/lighter above, actual in bold below
- **Negative values:** Red text
- **Current month column:** Subtle highlight (light orange or blue tint)
- **Sticky first column:** The line item / client name column should be sticky-left so it remains visible when scrolling horizontally

### Responsive Behavior

The budget grid is inherently wide (12+ columns). On smaller screens:
- Sidebar collapses to icon-only
- Grid scrolls horizontally with sticky first column
- No attempt to stack columns — financial grids need horizontal space

---

## 11. Deployment (Vercel + Neon)

### Step 1: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (name it whatever you want)
3. Copy the connection string — it looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`
4. You'll get two connection strings:
   - **Pooled** (for your app): ends with `?sslmode=require` — use this as `DATABASE_URL`
   - **Direct** (for migrations): has `-pooler` removed — use this as `DATABASE_URL_UNPOOLED`

### Step 2: Run Migrations

```bash
# Set the env var temporarily for migration
DATABASE_URL_UNPOOLED="your-direct-connection-string" npm run migrate
```

### Step 3: Seed Initial Data

```bash
DATABASE_URL="your-pooled-connection-string" npm run seed
```

### Step 4: Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. In project settings → Environment Variables, add:
   - `DATABASE_URL` = your Neon pooled connection string
   - `DATABASE_URL_UNPOOLED` = your Neon direct connection string
4. Deploy — Vercel auto-detects Next.js and builds it

### Step 5: Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your domain and follow the DNS instructions

### Vercel Configuration Notes

- **Build Command:** `next build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Node.js Version:** 20.x (default)
- **Framework Preset:** Next.js (auto-detected)
- **Function Region:** Choose the region closest to your Neon database (e.g., `iad1` for US East)

### Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Yes (for migrations) | Neon direct connection string |

That's it for the core app. See [Optional Integrations](#12-optional-integrations) for additional env vars if you add integrations later.

---

## 12. Optional Integrations

The core app works entirely with manual data entry and CSV uploads. But if you use any of these tools, you can add direct API integrations:

### Harvest (Time Tracking)

**What it does:** Auto-imports contractor hours and costs per client instead of uploading CSVs.

**Setup:**
- Get a Personal Access Token from Harvest (Account Settings → Developer → PAT)
- Add to `.env.local`: `HARVEST_ACCOUNT_ID`, `HARVEST_ACCESS_TOKEN`
- Create `lib/harvest-api.ts` that calls `GET /v2/time_entries` with pagination
- Add a "Sync from Harvest" button on the Upload page that calls your sync endpoint

**API Pattern:**
```typescript
// Fetch time entries for a date range
const response = await fetch(
  `https://api.harvestapp.com/v2/time_entries?from=${startDate}&to=${endDate}&page=${page}`,
  { headers: { 'Authorization': `Bearer ${token}`, 'Harvest-Account-ID': accountId } }
)
```

### QuickBooks Online (Accounting)

**What it does:** Auto-imports revenue (from invoices) and expenses instead of CSVs.

**Setup:**
- Register an app at developer.intuit.com
- Implement OAuth 2.0 flow (redirect-based)
- Store refresh tokens securely
- Add sync endpoints for customers, invoices, and journal entries

**Note:** QuickBooks OAuth is more complex than a simple API key. Consider whether the automation is worth the setup effort vs. just exporting CSVs from QuickBooks.

### Asana (Project Management)

**What it does:** Links client companies to Asana projects for cross-referencing.

**Setup:**
- Personal Access Token from Asana
- Store `asana_project_gid` on companies table
- Optional: show Asana tasks on client detail page

### Any CRM (Contact Management)

**What it does:** Syncs contact data instead of manual entry.

**Setup:** Varies by CRM. The companies and company_contacts tables have fields for external IDs.

---

## 13. Seed Data & First Run

### Seed Script (`scripts/seed.ts`)

```typescript
import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

async function seed() {
  const sql = neon(process.env.DATABASE_URL!)
  const year = new Date().getFullYear()

  // 1. Create your contractors
  // Customize these to your team!
  const contractors = [
    { name: 'Developer 1', hourly_rate: 100 },
    { name: 'Designer 1', hourly_rate: 85 },
    { name: 'Project Manager', hourly_rate: 75 },
  ]

  for (const c of contractors) {
    await sql`
      INSERT INTO contractors (name, hourly_rate)
      VALUES (${c.name}, ${c.hourly_rate})
      ON CONFLICT (name) DO UPDATE SET hourly_rate = ${c.hourly_rate}
    `
  }

  // 2. Create your expense templates
  // Customize these to your actual operating costs!
  const expenses = [
    { line_item: 'Payroll', default_amount: 0, sort_order: 1 },
    { line_item: 'Rent', default_amount: 0, sort_order: 2 },
    { line_item: 'Software & Tools', default_amount: 0, sort_order: 3 },
    { line_item: 'Insurance', default_amount: 0, sort_order: 4 },
    { line_item: 'Taxes & Fees', default_amount: 0, sort_order: 5 },
  ]

  for (const e of expenses) {
    await sql`
      INSERT INTO expense_templates (line_item, default_amount, sort_order)
      VALUES (${e.line_item}, ${e.default_amount}, ${e.sort_order})
      ON CONFLICT (line_item) DO UPDATE SET default_amount = ${e.default_amount}
    `
  }

  // 3. Initialize months for the current year with expense rows
  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, '0')}`

    await sql`
      INSERT INTO month_status (month) VALUES (${month})
      ON CONFLICT DO NOTHING
    `

    for (const e of expenses) {
      await sql`
        INSERT INTO client_financials (company_id, month, category, line_item, budget, sort_order)
        VALUES (NULL, ${month}, 'expense', ${e.line_item}, ${e.default_amount}, ${e.sort_order})
        ON CONFLICT DO NOTHING
      `
    }
  }

  // 4. Set annual goals (optional)
  await sql`
    INSERT INTO annual_goals (year, revenue_goal, revenue_stretch_goal)
    VALUES (${year}, 0, 0)
    ON CONFLICT (year) DO NOTHING
  `

  console.log('Seed complete!')
}

seed().catch(console.error)
```

### First Run Checklist

1. `npm install`
2. Set up `.env.local` with your Neon `DATABASE_URL`
3. `npm run migrate` — creates all tables
4. Edit `scripts/seed.ts` — customize contractors, expense categories, amounts
5. `npm run seed` — populates initial data
6. `npm run dev` — start the app at http://localhost:3001
7. Go to Settings — set your annual revenue goals
8. Go to Budget — add your first clients and start entering budgets
9. Go to Proposals — add any open deals in your pipeline

---

## 14. Customization Guide

### Changing the Fiscal Year

The app defaults to January-December. All date references use `"YYYY-MM"` format. To change the fiscal year start:
- Modify the `startMonth` and `endMonth` passed to `getFinancialGrid()`
- Update the seed script to initialize the correct months
- The P&L calculations don't assume Jan-Dec — they work on whatever months you pass

### Adding/Removing Expense Categories

Go to Settings and manage expense templates, or directly edit `scripts/seed.ts` and re-run. The budget grid will pick up new categories on the next page load.

### Changing Contractor Rates

Go to Settings → Contractors. Rate changes only affect future budgets — existing entries keep their historical rates.

### Different Currency

Search for `formatCurrency` and `formatCurrencyFull` in `lib/utils.ts` and adjust the Intl.NumberFormat options. The database stores raw numbers, so no schema changes needed.

### Different GM% Threshold

The 55% GM flag in analysis is hardcoded. Search for `55` in `lib/analysis.ts` and the analysis components to adjust.

### Adding More Proposal Stages

The `stage` column in `proposals` has a CHECK constraint. To add stages:
1. Alter the constraint: `ALTER TABLE proposals DROP CONSTRAINT ...; ALTER TABLE proposals ADD CONSTRAINT ... CHECK (stage IN ('lead','interested','proposal','contract'))`
2. Update the ProposalsClient component to display the new stage
3. Add a color for the new stage

### Multi-Year Support

The app currently focuses on one year at a time. To support multiple years:
- Add a year selector to the Budget page
- Pass different start/end months to the grid
- The database already supports any date range — no schema changes needed

---

## Building This With Claude Code

When you open a new repository with this file, tell Claude:

> "Read AGENCY_FINANCE_BUILD_GUIDE.md and help me build this financial dashboard step by step."

Claude will:
1. Set up the project scaffolding (Next.js, dependencies, etc.)
2. Create the database schema and seed scripts
3. Build each page one at a time, starting with the Budget grid
4. Create the API routes and library functions
5. Wire up the UI components

**Tips for working with Claude:**
- Build one page at a time. Start with Budget (it's the hardest), then Proposals, then the rest.
- Test each page before moving to the next.
- Customize as you go — when Claude asks about contractor names, expense categories, etc., give your real data.
- The schema and types should be created first, then the lib functions, then the UI.
- If something doesn't look right, describe what you see and Claude will fix it.

**Suggested build order:**
1. Project setup + database + seed
2. Layout (sidebar, navigation)
3. Budget grid (the big one — may take several iterations)
4. Settings page (contractors, goals, expense templates)
5. Proposals pipeline
6. Upload page
7. Client list + detail pages
8. Analysis dashboards (annual, then monthly)
9. Polish (responsive, loading states, error handling)
10. Deploy to Vercel

Good luck with the build!
