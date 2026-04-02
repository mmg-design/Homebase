'use client'
import { useState, useRef } from 'react'
import { formatCurrencyFull } from '@/lib/utils'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadRecord = { id: number; csv_type: string; month: string; file_name: string; row_count: number; uploaded_at: string; warnings: string[] }
type Company = { id: number; name: string; slug: string }

// Monarch Money business category mapping
const MONARCH_BUSINESS_ACCOUNTS = ['MMG Checking', 'MMG Savings', 'MMG Money Market']
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  '(BUSINESS) Software/Tools':          'Software & Tools',
  '(BUSINESS) Contractor Labor':        'Contractor Labor',
  '(BUSINESS) Advertising & Promotion': 'Advertising & Promotion',
  '(BUSINESS) Networking and Outreach': 'Networking & Outreach',
  '(BUSINESS) Travel & Meals':          'Travel & Meals',
  'Financial Fees':                     'Financial Fees',
}

export function UploadClient({ uploads, companies }: { uploads: UploadRecord[]; companies: Company[] }) {
  const [tab, setTab] = useState<'monarch' | 'stripe'>('monarch')
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number; warnings: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processMonarchCSV(file: File) {
    setLoading(true)
    setResult(null)
    const text = await file.text()
    const res = await fetch('/api/upload/monarch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: text, file_name: file.name }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processMonarchCSV(file)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Upload Data</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Import actuals from Monarch Money or sync from Stripe</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--light-mint)] rounded-lg p-1 w-fit">
        {[{ key: 'monarch', label: 'Monarch Money CSV' }, { key: 'stripe', label: 'Stripe Sync' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'monarch' | 'stripe')}
            className={cn('px-4 py-1.5 rounded text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white text-[var(--deep-teal)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'monarch' && (
        <div>
          {/* Category map info */}
          <div className="bg-[var(--light-mint)] rounded-lg p-4 mb-4 text-sm">
            <p className="font-medium text-[var(--deep-teal)] mb-2">How this works</p>
            <ul className="space-y-1 text-[var(--muted-foreground)]">
              <li>• Only transactions from <strong>MMG Checking, MMG Savings, MMG Money Market</strong> are imported</li>
              <li>• <strong>MMG Design</strong> category → logged as revenue actuals</li>
              <li>• Business expense categories → mapped to your OpEx vendors</li>
              <li>• Personal transactions are ignored</li>
            </ul>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
              dragging ? 'border-[var(--bright-teal)] bg-[var(--light-mint)]' : 'border-[var(--border)] hover:border-[var(--bright-teal)] hover:bg-[var(--light-mint)]/50'
            )}
          >
            <Upload className="mx-auto mb-3 text-[var(--muted-foreground)]" size={32} />
            <p className="text-sm font-medium text-[var(--foreground)]">Drop your Monarch Money CSV here</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processMonarchCSV(f) }}
            />
          </div>

          {loading && (
            <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">Processing…</div>
          )}

          {result && (
            <div className={cn('mt-4 p-4 rounded-lg border', result.warnings.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50')}>
              <div className="flex items-center gap-2 mb-2">
                {result.warnings.length > 0 ? <AlertCircle size={16} className="text-yellow-600" /> : <CheckCircle size={16} className="text-green-600" />}
                <p className="text-sm font-medium">{result.inserted} rows imported, {result.skipped} skipped</p>
              </div>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-700">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stripe' && (
        <div>
          <div className="bg-[var(--light-mint)] rounded-lg p-4 mb-4 text-sm">
            <p className="font-medium text-[var(--deep-teal)] mb-2">Stripe sync</p>
            <p className="text-[var(--muted-foreground)]">
              Pulls all successful payments from Stripe and matches them to your clients by customer name or description.
            </p>
          </div>
          <StripeSyncButton companies={companies} />
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
                  <th className="px-4 py-2 text-left">Type</th>
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
                    <td className="px-4 py-2 text-xs">{u.csv_type}</td>
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

function StripeSyncButton({ companies }: { companies: Company[] }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ synced: number; matched: number } | null>(null)

  async function sync() {
    setLoading(true)
    const res = await fetch('/api/stripe/sync', { method: 'POST' })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={sync}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--deep-teal)] text-white text-sm font-medium rounded-lg hover:bg-[var(--bright-teal)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Sync from Stripe'}
      </button>
      {result && (
        <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <p className="text-sm">{result.synced} payments synced · {result.matched} matched to clients</p>
        </div>
      )}
    </div>
  )
}
