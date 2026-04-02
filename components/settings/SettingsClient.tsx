'use client'
import { useState } from 'react'
import { formatCurrencyFull } from '@/lib/utils'
import { Plus, Save } from 'lucide-react'

type Contractor = { id: number; name: string; hourly_rate: number; is_active: boolean }
type Goal = { id: number; year: number; revenue_goal: number; revenue_stretch_goal: number }
type Template = { id: number; line_item: string; default_amount: number; is_active: boolean }

export function SettingsClient({ contractors: initial, goals: initialGoals, templates }: {
  contractors: Contractor[]; goals: Goal[]; templates: Template[]
}) {
  const [contractors, setContractors] = useState(initial)
  const [goals, setGoals] = useState(initialGoals)
  const [newContractor, setNewContractor] = useState({ name: '', hourly_rate: '' })
  const [goalEdit, setGoalEdit] = useState<Record<number, { revenue_goal: string; revenue_stretch_goal: string }>>({})
  const [saved, setSaved] = useState(false)

  async function addContractor() {
    const res = await fetch('/api/settings/contractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newContractor.name, hourly_rate: parseFloat(newContractor.hourly_rate) || 0 }),
    })
    const c = await res.json()
    setContractors(prev => [...prev, c])
    setNewContractor({ name: '', hourly_rate: '' })
  }

  async function saveGoal(year: number) {
    const edits = goalEdit[year]
    if (!edits) return
    await fetch('/api/settings/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, revenue_goal: parseFloat(edits.revenue_goal), revenue_stretch_goal: parseFloat(edits.revenue_stretch_goal) }),
    })
    setGoals(prev => prev.map(g => g.year === year ? {
      ...g,
      revenue_goal: parseFloat(edits.revenue_goal),
      revenue_stretch_goal: parseFloat(edits.revenue_stretch_goal),
    } : g))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[var(--deep-teal)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Manage contractors, goals, and expense categories</p>
      </div>

      {/* Contractors */}
      <section className="bg-white rounded-lg border border-[var(--border)] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--light-mint)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Contractors</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-right">Hourly Rate</th>
              <th className="px-4 py-2 text-center">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {contractors.map(c => (
              <tr key={c.id} className="hover:bg-[var(--light-mint)]/30">
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrencyFull(c.hourly_rate)}/hr</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-[var(--light-mint)] text-[var(--bright-teal)]' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'active' : 'inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {/* Add row */}
            <tr className="bg-[var(--light-mint)]/30">
              <td className="px-4 py-2">
                <input
                  placeholder="Name"
                  value={newContractor.name}
                  onChange={e => setNewContractor(p => ({ ...p, name: e.target.value }))}
                  className="border border-[var(--border)] rounded px-2 py-1 text-xs w-full outline-none focus:border-[var(--bright-teal)]"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  placeholder="Rate/hr"
                  type="number"
                  value={newContractor.hourly_rate}
                  onChange={e => setNewContractor(p => ({ ...p, hourly_rate: e.target.value }))}
                  className="border border-[var(--border)] rounded px-2 py-1 text-xs w-full outline-none focus:border-[var(--bright-teal)] text-right"
                />
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={addContractor}
                  disabled={!newContractor.name}
                  className="text-xs px-3 py-1 bg-[var(--deep-teal)] text-white rounded hover:bg-[var(--bright-teal)] transition-colors disabled:opacity-40"
                >
                  <Plus size={12} className="inline mr-1" />Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Revenue Goals */}
      <section className="bg-white rounded-lg border border-[var(--border)] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--light-mint)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Revenue Goals</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {goals.map(g => {
            const edits = goalEdit[g.year] || { revenue_goal: String(g.revenue_goal), revenue_stretch_goal: String(g.revenue_stretch_goal) }
            return (
              <div key={g.year} className="px-4 py-3 flex items-center gap-4">
                <span className="font-semibold text-[var(--deep-teal)] w-12">{g.year}</span>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-[var(--muted-foreground)]">Goal</label>
                  <input
                    type="number"
                    value={edits.revenue_goal}
                    onChange={e => setGoalEdit(p => ({ ...p, [g.year]: { ...edits, revenue_goal: e.target.value } }))}
                    className="border border-[var(--border)] rounded px-2 py-1 text-sm w-32 outline-none focus:border-[var(--bright-teal)]"
                  />
                  <label className="text-xs text-[var(--muted-foreground)]">Stretch</label>
                  <input
                    type="number"
                    value={edits.revenue_stretch_goal}
                    onChange={e => setGoalEdit(p => ({ ...p, [g.year]: { ...edits, revenue_stretch_goal: e.target.value } }))}
                    className="border border-[var(--border)] rounded px-2 py-1 text-sm w-32 outline-none focus:border-[var(--bright-teal)]"
                  />
                </div>
                <button
                  onClick={() => saveGoal(g.year)}
                  className="text-xs px-3 py-1.5 bg-[var(--deep-teal)] text-white rounded hover:bg-[var(--bright-teal)] transition-colors flex items-center gap-1"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            )
          })}
        </div>
        {saved && <p className="px-4 py-2 text-xs text-[var(--bright-teal)]">Saved!</p>}
      </section>

      {/* Expense Categories */}
      <section className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--light-mint)]">
          <h2 className="font-heading text-base text-[var(--deep-teal)]">Expense Categories</h2>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {templates.map(t => (
            <li key={t.id} className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm">{t.line_item}</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {t.default_amount > 0 ? `Default: ${formatCurrencyFull(t.default_amount)}` : 'Variable'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
