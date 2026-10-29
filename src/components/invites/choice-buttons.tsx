'use client'

import { cn } from '@/lib/utils'

interface ChoiceButtonsProps<T extends string | number> {
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (value: T | null) => void
  // Tapping the chosen option again clears it (the 1-5 ratings); otherwise one option always stays chosen
  clearable?: boolean
  disabled?: boolean
  className?: string
  label: string
}

// Large tap targets instead of a dropdown, for the phone on the pitch
export const ChoiceButtons = <T extends string | number>({ options, value, onChange, clearable = false, disabled = false, className, label }: ChoiceButtonsProps<T>) => (
  <div role="radiogroup" aria-label={label} className={cn('grid gap-1.5', className)}>
    {options.map((o) => {
      const active = o.value === value
      return (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          onClick={() => onChange(active && clearable ? null : o.value)}
          className={cn(
            'min-h-11 rounded-md border px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
          )}
        >
          {o.label}
        </button>
      )
    })}
  </div>
)
