import { ElementType, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type CardProps<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>

/** Standard white surface used for every panel, table wrapper, and form across the app. */
export function Card<T extends ElementType = 'div'>({ as, className, ...props }: CardProps<T>) {
  const Component = as || 'div'
  return <Component className={cn('bg-white rounded-2xl border border-[var(--border)] shadow-sm', className)} {...props} />
}
