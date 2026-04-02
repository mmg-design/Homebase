'use client'
import { useState } from 'react'
import { formatCurrencyFull } from '@/lib/utils'
import { Plus, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type Proposal = {
  id: number; client_name: string; stage: string; status: string;
  total_revenue: number; weighted_likelihood: number; length_months: number;
  potential_start_date: string | null; contact_name: string | null;
  notes: string | null; open_date: string; close_date: string | null;
}
type Company = { id: number; name: string; slug: string }

const STAGES = ['interested', 'proposal', 'contract']
const STAGE_COLORS: Record<string, string> = {
  interested: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  proposal:   'bg-blue-50 border-blue-200 text-blue-800',
  contract:   'bg-[var(--light-mint)] border-[var(--bright-teal)]/30 text-[var(--bright-teal)]',
}

export function ProposalsClient({ proposals: initial, companies }: { proposals: Proposal[]; companies: Company[] }) {
  const [proposals, setProposals] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ client_name: '', stage: 'interested', total_revenue: '', weighted_likelihood: 50, notes: '' })

  const open = proposals.filter(p => p.status === 'open')
  const weightedValue = open.reduce((sum, p) => sum + (Number(p.total_revenue) * p.weighted_likelihood / 100), 0)

  const byStage = (stage: string) => open.filter(p => p.stage === stage)

  async function addProposal() {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, total_revenue: parseFloat(form.total_revenue) || 0 }),
    })
    const newP = await res.json()
    setProposals(prev => [newP, ...prev])
    setShowAdd(false)
    setForm({ client_name: '', stage: 'interested', total_revenue: '', weighted_likelihood: 50, notes: '' })
  }

  async function updateStage(id: number, stage: string) {
    await fetch(`/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    setProposals(prev => prev.map(p => p.id === id ? { ...p, stage } : p))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Proposals</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {open.length} open · {formatCurrencyFull(weightedValue)} weighted pipeline
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--deep-teal)] text-white text-sm font-medium rounded-lg hover:bg-[var(--bright-teal)] transition-colors"
        >
          <Plus size={16} /> New Proposal
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-[var(--border)] rounded-lg p-4 mb-6">
          <h3 className="font-medium text-[var(--deep-teal)] mb-3">Add Proposal</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Client name"
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)]"
            />
            <input
              placeholder="Revenue ($)"
              type="number"
              value={form.total_revenue}
              onChange={e => setForm(f => ({ ...f, total_revenue: e.target.value }))}
              className="border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)]"
            />
            <select
              value={form.stage}
              onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)]"
            >
              {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">Likelihood {form.weighted_likelihood}%</label>
              <input
                type="range" min={0} max={100} value={form.weighted_likelihood}
                onChange={e => setForm(f => ({ ...f, weighted_likelihood: parseInt(e.target.value) }))}
                className="flex-1"
              />
            </div>
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="col-span-2 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--bright-teal)] resize-none h-16"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addProposal} className="px-4 py-1.5 bg-[var(--deep-teal)] text-white text-sm rounded hover:bg-[var(--bright-teal)] transition-colors">
              Add
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-4">
        {STAGES.map(stage => (
          <div key={stage} className="bg-[var(--light-mint)]/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </h3>
              <span className="text-xs font-medium text-[var(--deep-teal)]">
                {byStage(stage).length}
              </span>
            </div>
            <div className="space-y-2">
              {byStage(stage).map(p => (
                <div key={p.id} className={cn('bg-white rounded-lg border p-3', STAGE_COLORS[stage])}>
                  <p className="font-medium text-sm text-[var(--foreground)] leading-tight">{p.client_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {formatCurrencyFull(Number(p.total_revenue))} · {p.weighted_likelihood}%
                  </p>
                  {p.notes && <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{p.notes}</p>}
                  <div className="flex gap-1 mt-2">
                    {STAGES.filter(s => s !== stage).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStage(p.id, s)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white transition-colors"
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {byStage(stage).length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)] text-center py-4">None</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
