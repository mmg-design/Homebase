import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-[var(--deep-teal)] text-white hover:bg-[var(--deep-teal)]/90 disabled:opacity-50',
  secondary: 'bg-[var(--light-mint)] text-[var(--deep-teal)] hover:bg-[var(--bright-teal)] hover:text-white disabled:opacity-50',
  ghost: 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

/** The one button style used across the app — swap `variant` and `size`, never hand-roll button classes. */
export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors', variants[variant], sizes[size], className)} {...props} />
}
