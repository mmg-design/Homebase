import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  neutral: 'bg-[var(--light-mint)] text-[var(--bright-teal)]',
  navy: 'bg-[var(--dark-navy)] text-white',
  blue: 'bg-blue-600 text-white',
  amber: 'bg-amber-400 text-amber-950',
  emerald: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-600',
  muted: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones
}

/** Small uppercase pill used for status tags, categories, and inline labels (REC, Brand Deal, Live/Manual, etc). */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center gap-1 shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide', tones[tone], className)} {...props} />
}
