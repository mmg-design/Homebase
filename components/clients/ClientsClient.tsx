'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrencyFull, slugify } from '@/lib/utils'
import { Plus, X, Users, DollarSign, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Company = {
  id: number; name: string; slug: string; is_recurring: boolean
  status: string; total_revenue: number; active_months: number; notes: string | null
}
type CogsRow = {
  company_id: number; month: string; cost: number; hours: number; rate: number; contractor_name: string | null
}

interface Props { companies: Company[]; cogs: CogsRow[] }

export function ClientsClient({ companies: initial, cogs }: Props) {
  const [companies, setCompanies]   = useState(initial)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({
    name: '', is_recurring: false, status: 'active', notes: '',
  })
  const [saving, setSaving]         = useState(false)

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    // Optimistic update
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  // Build cogs map: company_id -> { totalCost, totalHours, contractors }
  const cogsMap: Record<number, { totalCost: number; totalHours: number; contractors: Record<string, { cost: number; hours: number }> }> = {}
  for (const row of cogs) {
    if (!cogsMap[row.company_id]) {
      cogsMap[row.company_id] = { totalCost: 0, totalHours: 0, contractors: {} }
    }
    const entry = cogsMap[row.company_id]
    entry.totalCost += Number(row.cost)
    entry.totalHours += Number(row.hours)
    const name = row.contractor_name || 'Unknown'
    if (!entry.contractors[name]) entry.contractors[name] = { cost: 0, hours: 0 }
    entry.contractors[name].cost  += Number(row.cost)
    entry.contractors[name].hours += Number(row.hours)
  }

  async function addClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const newClient = await res.json()
    setCompanies(prev => [newClient, ...prev])
    setShowModal(false)
    setForm({ name: '', is_recurring: false, status: 'active', notes: '' })
    setSaving(false)
  }

  const active    = companies.filter(c => c.status !== 'inactive')
  const inactive  = companies.filter(c => c.status === 'inactive')
  const recurring = active.filter(c => c.is_recurring)
  const project   = active.filter(c => !c.is_recurring)

  return (
    <div className="min-h-screen bg-[var(--background)] py-6 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Clients</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {active.length} active · {recurring.length} recurring{inactive.length > 0 ? ` · ${inactive.length} inactive` : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--deep-teal)] text-white text-sm font-medium rounded-lg hover:bg-[var(--bright-teal)] transition-colors"
          >
            <Plus size={16} /> Add Client
          </button>
        </div>

        {/* Recurring */}
        {recurring.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Recurring</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recurring.map(c => <ClientCard key={c.id} client={c} cogsData={cogsMap[c.id]} onToggleStatus={toggleStatus} />)}
            </div>
          </section>
        )}

        {/* Project */}
        {project.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Project Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.map(c => <ClientCard key={c.id} client={c} cogsData={cogsMap[c.id]} onToggleStatus={toggleStatus} />)}
            </div>
          </section>
        )}

        {/* Inactive */}
        {inactive.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Inactive</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
              {inactive.map(c => <ClientCard key={c.id} client={c} cogsData={cogsMap[c.id]} onToggleStatus={toggleStatus} />)}
            </div>
          </section>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-heading text-lg text-[var(--deep-teal)]">Add Client</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1">Client Name *</label>
                <input
                  placeholder="e.g. Acme Corp"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)] transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)]"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1">Type</label>
                  <div className="flex gap-2 mt-1">
                    {[{ label: 'Recurring', val: true }, { label: 'Project', val: false }].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setForm(f => ({ ...f, is_recurring: opt.val }))}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          form.is_recurring === opt.val
                            ? 'bg-[var(--deep-teal)] text-white border-[var(--deep-teal)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--bright-teal)]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1">Notes</label>
                <textarea
                  placeholder="Any notes about this client..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)] resize-none h-20"
                />
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-[var(--border)] bg-gray-50">
              <button
                onClick={addClient}
                disabled={!form.name.trim() || saving}
                className="flex-1 py-2 bg-[var(--deep-teal)] text-white text-sm font-medium rounded-lg hover:bg-[var(--bright-teal)] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Add Client'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientCard({ client, cogsData, onToggleStatus }: {
  client: Company
  cogsData?: { totalCost: number; totalHours: number; contractors: Record<string, { cost: number; hours: number }> }
  onToggleStatus: (id: number, status: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const rev    = Number(client.total_revenue)
  const cost   = cogsData?.totalCost || 0
  const profit = rev - cost
  const gm     = rev > 0 ? (profit / rev) * 100 : null
  const isActive = client.status !== 'inactive'

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] hover:border-[var(--bright-teal)]/40 hover:shadow-sm transition-all overflow-hidden">
      <Link href={`/clients/${client.slug}`} className="block p-4">
        <div className="flex items-start justify-between">
          <p className="font-medium text-[var(--foreground)] leading-tight hover:text-[var(--deep-teal)] transition-colors">
            {client.name}
          </p>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2',
            isActive ? 'bg-[var(--light-mint)] text-[var(--bright-teal)]' : 'bg-gray-100 text-gray-500'
          )}>
            {client.status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
              <DollarSign size={10} /> Revenue
            </p>
            <p className="text-sm font-semibold text-[var(--deep-teal)]">{formatCurrencyFull(rev)}</p>
          </div>
          {cost > 0 ? (
            <div>
              <p className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                <Clock size={10} /> Labor Cost
              </p>
              <p className="text-sm font-semibold text-orange-600">{formatCurrencyFull(cost)}</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-[var(--muted-foreground)]">Months Active</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{client.active_months}</p>
            </div>
          )}
        </div>

        {gm !== null && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-[var(--muted-foreground)]">Profit Margin</p>
              <p className={cn('text-[10px] font-semibold', gm >= 60 ? 'text-[var(--bright-teal)]' : gm >= 30 ? 'text-yellow-600' : 'text-red-500')}>
                {Math.round(gm)}%
              </p>
            </div>
            <div className="w-full h-1 bg-[var(--border)] rounded-full">
              <div
                className={cn('h-full rounded-full', gm >= 60 ? 'bg-[var(--bright-teal)]' : gm >= 30 ? 'bg-yellow-400' : 'bg-red-400')}
                style={{ width: `${Math.min(100, Math.max(0, gm))}%` }}
              />
            </div>
          </div>
        )}
      </Link>

      {/* Active / Inactive toggle */}
      <div className="border-t border-[var(--border)]">
        <button
          onClick={async (e) => {
            e.preventDefault()
            setToggling(true)
            await onToggleStatus(client.id, client.status)
            setToggling(false)
          }}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2 text-[11px] font-medium transition-colors',
            isActive
              ? 'text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50'
              : 'text-[var(--bright-teal)] hover:bg-[var(--light-mint)]'
          )}
        >
          <span>{isActive ? 'Set Inactive' : 'Reactivate'}</span>
          {toggling
            ? <span className="text-[10px] opacity-50">Saving…</span>
            : isActive
              ? <ToggleRight size={15} className="text-[var(--bright-teal)]" />
              : <ToggleLeft size={15} className="text-gray-400" />
          }
        </button>
      </div>

      {/* Contractor breakdown (if any hours logged) */}
      {cogsData && Object.keys(cogsData.contractors).length > 0 && (
        <div className="border-t border-[var(--border)]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--light-mint)]/40 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Users size={10} />
              {Object.keys(cogsData.contractors).length} team member{Object.keys(cogsData.contractors).length !== 1 ? 's' : ''} · {cogsData.totalHours.toFixed(1)}h
            </span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-1">
              {Object.entries(cogsData.contractors).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">{name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {data.hours.toFixed(1)}h · {formatCurrencyFull(data.cost)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
