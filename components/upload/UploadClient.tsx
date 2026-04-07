'use client'
import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadRecord = { id: number; csv_type: string; month: string; file_name: string; row_count: number; uploaded_at: string; warnings: string[] }

const BUSINESS_ACCOUNTS = ['MMG Checking', 'MMG Savings', 'MMG Money Market']
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  '(BUSINESS) Software/Tools':          'Software & Tools',
  '(BUSINESS) Contractor Labor':        'Contractor Labor',
  '(BUSINESS) Advertising & Promotion': 'Advertising & Promotion',
  '(BUSINESS) Networking and Outreach': 'Networking & Outreach',
  '(BUSINESS) Travel & Meals':          'Travel & Meals',
  'Financial Fees':                     'Financial Fees',
}

type PreviewItem  = { merchant: string; date: string; amount: number; opexCategory: string }
type PreviewMonth = { month: string; items: PreviewItem[]; total: number; byCategory: Record<string, number> }
type Preview      = { months: PreviewMonth[]; totalExpenses: number; totalRows: number; fileName: string; rawCSV: string }

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

function buildPreview(text: string, fileName: string): Preview {
  const rows = parseCSV(text)
  const bizRows = rows.filter(r => BUSINESS_ACCOUNTS.includes(r['Account']))

  const monthMap: Record<string, PreviewMonth> = {}

  for (const row of bizRows) {
    const date = row['Date']
    if (!date) continue
    const [yr, mo] = date.split('-')
    if (!yr || !mo) continue
    const month = `${yr}-${mo}`

    const amount = parseFloat(row['Amount']) || 0
    const category = row['Category']
    const merchant = row['Merchant'] || row['Name'] || '—'

    const opexCategory = EXPENSE_CATEGORY_MAP[category]
    if (!opexCategory || amount >= 0) continue  // only negative (expense) rows in mapped categories

    const absAmount = Math.abs(amount)

    if (!monthMap[month]) monthMap[month] = { month, items: [], total: 0, byCategory: {} }
    monthMap[month].items.push({ merchant, date, amount: absAmount, opexCategory })
    monthMap[month].total += absAmount
    monthMap[month].byCategory[opexCategory] = (monthMap[month].byCategory[opexCategory] || 0) + absAmount
  }

  const months = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  const totalExpenses = months.reduce((s, m) => s + m.total, 0)
  const totalRows = months.reduce((s, m) => s + m.items.length, 0)

  return { months, totalExpenses, totalRows, fileName, rawCSV: text }
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}
function fmtMonth(m: string) {
  const [yr, mo] = m.split('-')
  return new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function UploadClient({ uploads }: { uploads: UploadRecord[] }) {
  const [dragging, setDragging]   = useState(false)
  const [preview, setPreview]     = useState<Preview | null>(null)
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ inserted: number; skipped: number; warnings: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) return
    setResult(null)
    file.text().then(text => {
      const p = buildPreview(text, file.name)
      setPreview(p)
      // Auto-expand single month
      if (p.months.length === 1) setExpanded({ [p.months[0].month]: true })
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function confirmImport() {
    if (!preview) return
    setImporting(true)
    const res = await fetch('/api/upload/monarch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: preview.rawCSV, file_name: preview.fileName }),
    })
    const data = await res.json()
    setResult(data)
    setPreview(null)
    setImporting(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Upload Data</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Import operating expenses from Monarch Money</p>
      </div>

      {/* How it works */}
      <div className="bg-[var(--light-mint)] rounded-lg p-4 mb-5 text-sm">
        <p className="font-medium text-[var(--deep-teal)] mb-2">How this works</p>
        <ul className="space-y-1 text-[var(--muted-foreground)]">
          <li>• Only transactions from <strong>MMG Checking, MMG Savings, MMG Money Market</strong> are read</li>
          <li>• Business expense categories are mapped to your OpEx vendors and update gross profit</li>
          <li>• A preview is shown before anything is saved — you confirm before importing</li>
          <li>• Personal transactions and revenue entries are ignored</li>
        </ul>
      </div>

      {/* Drop zone — only show when no preview */}
      {!preview && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
              dragging
                ? 'border-[var(--bright-teal)] bg-[var(--light-mint)]'
                : 'border-[var(--border)] hover:border-[var(--bright-teal)] hover:bg-[var(--light-mint)]/50'
            )}
          >
            <Upload className="mx-auto mb-3 text-[var(--muted-foreground)]" size={32} />
            <p className="text-sm font-medium text-[var(--foreground)]">Drop your Monarch Money CSV here</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">or click to browse · .csv files only</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        </>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Preview header */}
          <div className="bg-[var(--dark-navy)] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">Preview — {preview.fileName}</p>
              <p className="text-[var(--bright-teal)] text-xs mt-0.5">
                {preview.totalRows} expense transactions · {preview.months.length} month{preview.months.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Total OpEx</p>
              <p className="text-white font-heading text-xl">{fmtMoney(preview.totalExpenses)}</p>
            </div>
          </div>

          {/* Month breakdowns */}
          <div className="divide-y divide-[var(--border)]">
            {preview.months.map(m => (
              <div key={m.month} className="bg-white">
                {/* Month header — clickable to expand */}
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--light-mint)]/40 transition-colors text-left"
                  onClick={() => setExpanded(ex => ({ ...ex, [m.month]: !ex[m.month] }))}
                >
                  <div className="flex items-center gap-3">
                    {expanded[m.month] ? <ChevronUp size={14} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={14} className="text-[var(--muted-foreground)]" />}
                    <span className="text-sm font-semibold text-[var(--deep-teal)]">{fmtMonth(m.month)}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{m.items.length} transactions</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">{fmtMoney(m.total)}</span>
                </button>

                {/* Category summary (always visible) */}
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {Object.entries(m.byCategory).map(([cat, amt]) => (
                    <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--light-mint)] text-[var(--deep-teal)]">
                      {cat} · {fmtMoney(amt)}
                    </span>
                  ))}
                </div>

                {/* Transaction rows (expanded) */}
                {expanded[m.month] && (
                  <div className="px-5 pb-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                          <th className="text-left py-1.5 font-medium">Date</th>
                          <th className="text-left py-1.5 font-medium">Merchant</th>
                          <th className="text-left py-1.5 font-medium">Category</th>
                          <th className="text-right py-1.5 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]/50">
                        {m.items.map((item, i) => (
                          <tr key={i} className="text-[var(--foreground)]">
                            <td className="py-1.5 text-[var(--muted-foreground)]">{item.date}</td>
                            <td className="py-1.5 font-medium">{item.merchant}</td>
                            <td className="py-1.5 text-[var(--muted-foreground)]">{item.opexCategory}</td>
                            <td className="py-1.5 text-right">{fmtMoney(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="bg-gray-50 border-t border-[var(--border)] px-5 py-4 flex items-center justify-between gap-3">
            <button
              onClick={() => { setPreview(null); setResult(null) }}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              ← Choose different file
            </button>
            <button
              onClick={confirmImport}
              disabled={importing || preview.totalRows === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--deep-teal)', color: 'white' }}
            >
              {importing ? 'Importing…' : `Confirm & Import ${preview.totalRows} transactions`}
            </button>
          </div>
        </div>
      )}

      {/* Empty preview (no matching expense rows) */}
      {preview && preview.totalRows === 0 && (
        <div className="mt-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50 flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">No business expense transactions found in this file. Check that your Monarch accounts and categories match the expected names above.</p>
        </div>
      )}

      {/* Result after import */}
      {result && (
        <div className={cn('mt-4 p-4 rounded-lg border', result.warnings.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50')}>
          <div className="flex items-center gap-2 mb-1">
            {result.warnings.length > 0
              ? <AlertCircle size={16} className="text-yellow-600" />
              : <CheckCircle size={16} className="text-green-600" />}
            <p className="text-sm font-semibold">
              {result.inserted} expense{result.inserted !== 1 ? 's' : ''} imported into OpEx
            </p>
          </div>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-700 mt-0.5">{w}</p>
          ))}
        </div>
      )}

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-base text-[var(--deep-teal)] mb-3">Upload History</h2>
          <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--light-mint)] text-[var(--muted-foreground)] text-xs">
                  <th className="px-4 py-2 text-left">File</th>
                  <th className="px-4 py-2 text-center">Rows</th>
                  <th className="px-4 py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {uploads.map(u => (
                  <tr key={u.id} className="hover:bg-[var(--light-mint)]/30">
                    <td className="px-4 py-2 flex items-center gap-2">
                      <FileText size={14} className="text-[var(--muted-foreground)]" />
                      {u.file_name || '—'}
                    </td>
                    <td className="px-4 py-2 text-center">{u.row_count}</td>
                    <td className="px-4 py-2 text-right text-xs text-[var(--muted-foreground)]">
                      {new Date(u.uploaded_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
