import { ReactNode } from 'react'

/** Standard page header: eyebrow + serif title + subtitle, with an optional right-aligned action. */
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--bright-teal)] font-semibold">{eyebrow}</p>
        <h1 className="font-heading text-3xl text-[var(--deep-teal)] mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
