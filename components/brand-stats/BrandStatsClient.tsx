'use client'

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { BarChart3, Check, ExternalLink, Instagram, Linkedin, Mail, Mic2, RefreshCw, Users, Youtube } from 'lucide-react'
import { BRAND_CHANNELS } from '@/lib/brand-channels'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type Stat = { channel_id: string; logged_on: string; followers: number | null; impressions: number | null; views: number | null; source: string; note: string | null }
const ranges = [{ label: '24H', days: 1 }, { label: '48H', days: 2 }, { label: '7D', days: 7 }, { label: '14D', days: 14 }, { label: '30D', days: 30 }, { label: '60D', days: 60 }, { label: '90D', days: 90 }]
const icons: Record<string, typeof Youtube> = { YouTube: Youtube, Instagram, LinkedIn: Linkedin, Podcast: Mic2, Community: Users, Newsletter: Mail, Substack: Mail, X: BarChart3 }
const number = (value: number | null | undefined) => new Intl.NumberFormat('en-US', { notation: value && Math.abs(value) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0)
const percent = (current: number | null, previous: number | null) => !current || previous === null || previous === 0 ? null : ((current - previous) / previous) * 100
const parseMetric = (value: unknown) => value === '' || value === null || value === undefined ? null : Math.max(0, Math.round(Number(value)))

export function BrandStatsClient({ stats: initialStats, connectedChannels }: { stats: Stat[]; connectedChannels: string[] }) {
  const router = useRouter()
  const [stats, setStats] = useState(initialStats)
  const [windowDays, setWindowDays] = useState(1)
  const [form, setForm] = useState({ channel_id: 'linkedin', logged_on: new Date().toISOString().slice(0, 10), followers: '', downloads: '', views: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const isFirstRender = useRef(true)

  // initialStats is a fresh array from the server every time router.refresh() resolves
  // (after "Refresh stats" re-syncs every connected channel). Without this, the page
  // would keep showing whatever was on screen at first load no matter how often you refresh.
  // The charts pick up the change on their own (see StatChart) and spring to the new values.
  useEffect(() => {
    setStats(initialStats)
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setRefreshing(false)
  }, [initialStats])
  const cutoff = new Date(Date.now() - (windowDays - 1) * 86400000).toISOString().slice(0, 10)
  const filteredStats = stats.filter(stat => stat.logged_on >= cutoff)
  const byChannel = useMemo(() => BRAND_CHANNELS.map(channel => ({ channel, history: filteredStats.filter(stat => stat.channel_id === channel.id).sort((a, b) => a.logged_on.localeCompare(b.logged_on)) })), [filteredStats])
  const dates = [...new Set(filteredStats.map(stat => stat.logged_on))].sort().reverse()
  const selectedChannel = BRAND_CHANNELS.find(channel => channel.id === form.channel_id)
  const isPodcast = selectedChannel?.id === 'spotify'
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('')
    const response = await fetch('/api/brand-stats/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, views: isPodcast ? undefined : form.views }) })
    setSaving(false)
    if (!response.ok) { setMessage('Could not save this entry.'); return }
    const replacement: Stat = {
      channel_id: form.channel_id,
      logged_on: form.logged_on,
      followers: parseMetric(form.followers),
      impressions: isPodcast ? parseMetric(form.downloads) : null,
      views: isPodcast ? null : parseMetric(form.views),
      source: 'manual',
      note: form.note || null,
    }
    setStats(previous => {
      const exists = previous.some(item => item.channel_id === replacement.channel_id && item.logged_on === replacement.logged_on)
      return exists ? previous.map(item => item.channel_id === replacement.channel_id && item.logged_on === replacement.logged_on ? replacement : item) : [...previous, replacement]
    })
    setMessage('Saved.')
  }
  const refresh = async () => { setRefreshing(true); await fetch('/api/brand-stats/refresh', { method: 'POST' }); router.refresh() }
  const updateTableStat = async (channelId: string, loggedOn: string, value: number) => { const channel = BRAND_CHANNELS.find(item => item.id === channelId); if (!channel) return false; const current = stats.find(item => item.channel_id === channelId && item.logged_on === loggedOn); const primaryMetric = channel.primaryMetric || 'followers'; const next = { followers: current?.followers ?? null, impressions: current?.impressions ?? null, views: current?.views ?? null }; next[primaryMetric] = value; const response = await fetch('/api/brand-stats/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel_id: channelId, logged_on: loggedOn, followers: next.followers ?? '', downloads: channelId === 'spotify' ? next.impressions ?? '' : undefined, views: channelId === 'spotify' ? undefined : next.views ?? '', note: current?.note || '' }) }); if (!response.ok) return false; setStats(previous => { const replacement: Stat = { channel_id: channelId, logged_on: loggedOn, followers: parseMetric(next.followers), impressions: parseMetric(next.impressions), views: parseMetric(next.views), source: 'manual', note: current?.note || null }; return current ? previous.map(item => item.channel_id === channelId && item.logged_on === loggedOn ? replacement : item) : [...previous, replacement] }); return true }

  return <div className="min-h-screen bg-[var(--background)] py-6 px-4"><div className="max-w-[1500px] mx-auto space-y-5">
    <PageHeader
      eyebrow="MMG Homebase"
      title="Brand Stats"
      subtitle="Daily audience, downloads, and views across your brand."
      action={<Button onClick={refresh} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh stats'}</Button>}
    />
    <Card className="px-4 py-3 flex flex-wrap gap-2 items-center"><span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--muted-foreground)] mr-1">Growth window</span>{ranges.map(range => <button key={range.days} onClick={() => setWindowDays(range.days)} className={windowDays === range.days ? 'rounded-md bg-[var(--dark-navy)] px-3 py-1.5 text-xs font-semibold text-white' : 'rounded-md bg-[var(--light-mint)] px-3 py-1.5 text-xs font-semibold text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white'}>{range.label}</button>)}</Card>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{byChannel.map(({ channel, history }) => <ChannelCard key={channel.id} channel={channel} history={history} connected={connectedChannels.includes(channel.id)} onUpdate={updateTableStat} />)}</div>
    <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_2.05fr] gap-5"><Card as="form" onSubmit={submit} className="p-5 space-y-4"><div><h2 className="font-heading text-lg text-[var(--deep-teal)]">Log Daily Stats</h2><p className="text-xs text-[var(--muted-foreground)] mt-1">Add a new daily snapshot for any channel.</p></div><label className="block text-xs font-medium">Channel<select value={form.channel_id} onChange={event => setForm({ ...form, channel_id: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{BRAND_CHANNELS.map(channel => <option key={channel.id} value={channel.id}>{channel.name} · {channel.platform}</option>)}</select></label><label className="block text-xs font-medium">Date<input type="date" value={form.logged_on} onChange={event => setForm({ ...form, logged_on: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" /></label><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-medium">Followers<input type="number" min="0" value={form.followers} onChange={event => setForm({ ...form, followers: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm" /></label>{isPodcast ? <label className="block text-xs font-medium">Downloads<input type="number" min="0" value={form.downloads} onChange={event => setForm({ ...form, downloads: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm" /></label> : <label className="block text-xs font-medium">Views<input type="number" min="0" value={form.views} onChange={event => setForm({ ...form, views: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm" /></label>}</div><label className="block text-xs font-medium">Note<input value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Optional context" className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" /></label><Button disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save daily stats'}</Button>{message && <p className="text-xs text-[var(--bright-teal)]">{message}</p>}</Card>
      <DailyTable dates={dates} stats={filteredStats} onSave={updateTableStat} />
    </div>
  </div></div>
}

function ChannelCard({ channel, history, connected, onUpdate }: { channel: typeof BRAND_CHANNELS[number]; history: Stat[]; connected: boolean; onUpdate: (channelId: string, loggedOn: string, value: number) => Promise<boolean> }) {
  const Icon = icons[channel.platform] || BarChart3
  const latest = history.at(-1), first = history[0]
  const primaryMetric = channel.primaryMetric || 'followers'
  const growth = latest && first ? percent(latest[primaryMetric], first[primaryMetric]) : null
  const live = !!latest && latest.source !== 'manual'
  const today = new Date().toISOString().slice(0, 10)
  return <Card className="p-5 min-h-[280px]"><div className="flex justify-between gap-4"><div className="flex gap-3"><div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white" style={{ background: channel.color }}>{channel.avatar ? <Image src={channel.avatar} alt={`${channel.name} profile`} fill sizes="40px" className="object-cover" /> : <Icon size={19} />}</div><div><p className="font-semibold text-[var(--foreground)] leading-tight">{channel.name}</p><p className="text-xs text-[var(--muted-foreground)] mt-0.5">{channel.platform}</p></div></div><div className="flex items-center gap-2">{latest && <Badge tone={live ? 'emerald' : 'muted'} title={live ? 'Updated automatically' : 'Updated by manual entry'} className="rounded-full px-2 py-1 text-[10px]"><span className={live ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]'} />{live ? 'Live' : 'Manual'}</Badge>}{channel.url && <a href={channel.url} target="_blank" rel="noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--deep-teal)]"><ExternalLink size={16} /></a>}</div></div><div className="mt-5 flex items-end justify-between"><EditableMetric label={channel.primaryLabel || channel.audienceLabel || 'Followers'} value={latest ? latest[primaryMetric] : null} onSave={value => onUpdate(channel.id, today, value)} />{growth !== null && <Badge tone={growth >= 0 ? 'emerald' : 'red'} className="rounded-full px-2 py-1 text-xs normal-case">{growth >= 0 ? '+' : ''}{growth.toFixed(2)}%</Badge>}</div><StatChart channelId={channel.id} color={channel.color} values={history.map(item => item[primaryMetric] || 0)} /><div className="mt-1 flex justify-between text-[10px] text-[var(--muted-foreground)]"><span>{history[0]?.logged_on || 'Start'}</span><span>{latest?.logged_on || 'Latest update'}</span></div>{primaryMetric === 'impressions' ? <div className="mt-3 text-xs"><p className="text-[var(--muted-foreground)]">Followers</p><p className="font-semibold mt-0.5">{latest ? number(latest.followers) : '—'}</p></div> : <div className="grid grid-cols-2 gap-3 mt-3 text-xs"><div><p className="text-[var(--muted-foreground)]">Impressions</p><p className="font-semibold mt-0.5">{latest ? number(latest.impressions) : '—'}</p></div><div><p className="text-[var(--muted-foreground)]">Views</p><p className="font-semibold mt-0.5">{latest ? number(latest.views) : '—'}</p></div></div>}{channel.id.startsWith('youtube') && <a href={`/api/auth/youtube?channel=${channel.id}`} className="inline-block mt-4 text-xs font-semibold text-[var(--bright-teal)] hover:underline">{connected ? 'Reconnect YouTube' : 'Connect YouTube'}</a>}{channel.id === 'instagram' && <a href="/api/auth/instagram" className="inline-block mt-4 text-xs font-semibold text-[var(--bright-teal)] hover:underline">{connected ? 'Reconnect Instagram' : 'Connect Instagram'}</a>}</Card>
}

// Click the big number on a card to log a fresh value for today directly — no need to use the
// form at the bottom. Saves through the same path as the Daily Stats table, so the chart springs
// to the new value and the new entry shows up in Daily Stats immediately, same as any other edit.
function EditableMetric({ label, value, onSave }: { label: string; value: number | null; onSave: (value: number) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  return <div>
    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
    {editing ? (
      <input
        type="number" min="0" autoFocus defaultValue={value ?? ''}
        className="text-3xl font-semibold text-[var(--deep-teal)] mt-0.5 w-28 rounded-lg border border-[var(--bright-teal)] px-1.5 outline-none"
        onBlur={async event => {
          const next = Number(event.target.value)
          setEditing(false)
          if (!Number.isFinite(next) || next < 0) return
          setSaving(true)
          const ok = await onSave(next)
          setSaving(false)
          if (ok) { setJustSaved(true); setTimeout(() => setJustSaved(false), 1600) }
        }}
        onKeyDown={event => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); if (event.key === 'Escape') setEditing(false) }}
      />
    ) : (
      <button type="button" onClick={() => setEditing(true)} disabled={saving} className="flex items-center gap-1.5 mt-0.5 disabled:opacity-60">
        <span className="text-3xl font-semibold text-[var(--deep-teal)] hover:underline decoration-dashed decoration-[var(--bright-teal)]/50 underline-offset-4">{value !== null && value !== undefined ? number(value) : '—'}</span>
        {justSaved && <Check size={16} className="text-emerald-600 shrink-0" />}
      </button>
    )}
  </div>
}

// A fixed number of samples means the line always has the same shape regardless of how many
// real data points it's drawn from, so it can spring-morph smoothly between any two states.
const CHART_SAMPLES = 40
const CHART_XS = Array.from({ length: CHART_SAMPLES }, (_, i) => 4 + (i / (CHART_SAMPLES - 1)) * 92)

// A gentle overshoot-and-settle curve — this is what makes the line feel like it "springs"
// into place rather than just easing to a stop.
function springEase(t: number) {
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function resampleY(chartValues: number[], min: number, range: number) {
  const n = chartValues.length
  return CHART_XS.map((_, i) => {
    const pos = (i / (CHART_SAMPLES - 1)) * (n - 1)
    const lo = Math.floor(pos), hi = Math.min(n - 1, lo + 1), frac = pos - lo
    const value = chartValues[lo] + (chartValues[hi] - chartValues[lo]) * frac
    return 78 - ((value - min) / range) * 48
  })
}

function StatChart({ channelId, color, values }: { channelId: string; color: string; values: number[] }) {
  const chartValues = values.length > 1 ? values : values.length === 1 ? [Math.max(0, values[0] * 0.985), values[0]] : [0, 1]
  const min = Math.min(...chartValues), max = Math.max(...chartValues), range = Math.max(max - min, Math.max(max * 0.03, 1))
  const targetYs = resampleY(chartValues, min, range)
  const gradientId = `chart-${channelId}`

  const lineRef = useRef<SVGPolylineElement>(null)
  const areaRef = useRef<SVGPolygonElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const currentYs = useRef(targetYs)
  const frameRef = useRef<number>(0)
  const isFirstRun = useRef(true)

  const applyYs = (ys: number[]) => {
    const pts = CHART_XS.map((x, i) => `${x},${ys[i].toFixed(2)}`).join(' ')
    lineRef.current?.setAttribute('points', pts)
    areaRef.current?.setAttribute('points', `${pts} 96,96 4,96`)
    dotRef.current?.setAttribute('cx', String(CHART_XS[CHART_XS.length - 1]))
    dotRef.current?.setAttribute('cy', String(ys[ys.length - 1]))
  }

  useLayoutEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; currentYs.current = targetYs; applyYs(targetYs); return }
    const from = currentYs.current
    const to = targetYs
    const duration = 600
    const start = performance.now()
    cancelAnimationFrame(frameRef.current)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = springEase(t)
      const ys = from.map((fromY, i) => fromY + (to[i] - fromY) * eased)
      applyYs(ys)
      if (t < 1) { frameRef.current = requestAnimationFrame(tick) } else { currentYs.current = to }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetYs.join(',')])

  return <div className="h-[88px] mt-4 rounded-xl overflow-hidden bg-[var(--light-mint)]/25"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0.015" /></linearGradient></defs><polygon ref={areaRef} fill={`url(#${gradientId})`} /><polyline ref={lineRef} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /><circle ref={dotRef} r="2.3" fill={color} stroke="white" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg></div>
}

function DailyTable({ dates, stats, onSave }: { dates: string[]; stats: Stat[]; onSave: (channelId: string, loggedOn: string, value: number) => Promise<boolean> }) {
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const get = (date: string, channelId: string) => stats.find(stat => stat.logged_on === date && stat.channel_id === channelId)
  const previous = (date: string, channelId: string) => stats.filter(stat => stat.channel_id === channelId && stat.logged_on < date).sort((a, b) => b.logged_on.localeCompare(a.logged_on))[0]
  return <Card className="overflow-hidden"><div className="px-5 py-4 border-b border-[var(--border)]"><h2 className="font-heading text-lg text-[var(--deep-teal)]">Daily Stats</h2><p className="text-xs text-[var(--muted-foreground)] mt-1">Click any recorded value to edit it directly. Each value includes day-over-day growth when a prior log exists.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="bg-[var(--light-mint)] text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]"><th className="sticky left-0 bg-[var(--light-mint)] text-left px-4 py-2.5">Date</th>{BRAND_CHANNELS.map(channel => <th key={channel.id} className="px-3 py-2.5 text-left min-w-[130px]"><span className="flex items-center gap-1.5"><span className="relative block w-4 h-4 rounded overflow-hidden" style={{ background: channel.color }}>{channel.avatar && <Image src={channel.avatar} alt="" fill sizes="16px" className="object-cover" />}</span>{channel.name}</span></th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{dates.map(date => <tr key={date}><td className="sticky left-0 bg-white px-4 py-3 text-xs font-medium">{date}</td>{BRAND_CHANNELS.map(channel => { const metric = channel.primaryMetric || 'followers', stat = get(date, channel.id), prior = previous(date, channel.id), change = stat ? percent(stat[metric], prior?.[metric] ?? null) : null, cellId = `${date}-${channel.id}`, editing = editingCell === cellId; return <td key={channel.id} className="px-3 py-3 align-top">{editing ? <input type="number" min="0" defaultValue={stat?.[metric] ?? ''} autoFocus onBlur={async event => { const value = Number(event.target.value); setEditingCell(null); if (!Number.isFinite(value) || value < 0) return; setSavingCell(cellId); await onSave(channel.id, date, value); setSavingCell(null) }} onKeyDown={event => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); if (event.key === 'Escape') setEditingCell(null) }} className="w-[86px] rounded border border-[var(--bright-teal)] px-2 py-1 text-sm font-semibold outline-none" /> : <button disabled={!stat || savingCell === cellId} onClick={() => setEditingCell(cellId)} className={stat ? 'rounded px-1 -ml-1 text-left hover:bg-[var(--light-mint)] focus:outline-none focus:ring-2 focus:ring-[var(--bright-teal)]/30 disabled:opacity-50' : 'cursor-default text-left'}><p className="font-semibold">{stat ? number(stat[metric]) : '—'}</p>{change !== null && <p className={change >= 0 ? 'text-[10px] text-emerald-600' : 'text-[10px] text-red-600'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% DoD</p>}</button>}</td> })}</tr>)}{dates.length === 0 && <tr><td colSpan={BRAND_CHANNELS.length + 1} className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">No stats logged in this selected period.</td></tr>}</tbody></table></div></Card>
}
