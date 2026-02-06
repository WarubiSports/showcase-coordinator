'use client'

import { User, UserPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Attendee } from '@/types'

interface MultiAssignSelectProps {
  value: string[] | null
  attendees: Attendee[]
  onAssign: (value: string[] | null) => void
  size?: 'sm' | 'xs'
}

export function MultiAssignSelect({ value, attendees, onAssign, size = 'sm' }: MultiAssignSelectProps) {
  const selected = value ?? []

  const toggle = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter(n => n !== name)
      : [...selected, name]
    onAssign(next.length > 0 ? next : null)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-dashed px-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          size === 'xs' ? 'min-h-6 py-0.5 text-[11px]' : 'min-h-7 py-1 text-xs',
          selected.length === 0 ? 'text-muted-foreground' : 'border-primary/30 bg-primary/5',
        )}
      >
        {selected.length === 0 ? (
          <>
            <UserPlus className="h-3 w-3 shrink-0" />
            <span>Assign...</span>
          </>
        ) : (
          <>
            <User className="h-3 w-3 shrink-0 text-primary" />
            <span className="text-primary">{selected.join(', ')}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
        {attendees.map(a => (
          <DropdownMenuCheckboxItem
            key={a.id}
            checked={selected.includes(a.name)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(a.name)}
          >
            {a.name}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onSelect={(e) => { e.preventDefault(); onAssign(null) }}
            >
              Clear all
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
