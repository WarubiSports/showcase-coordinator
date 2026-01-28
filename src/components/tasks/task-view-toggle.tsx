'use client'

import { LayoutGrid, Columns3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TaskViewType = 'cards' | 'kanban' | 'list'

interface TaskViewToggleProps {
  view: TaskViewType
  onViewChange: (view: TaskViewType) => void
}

const views: { value: TaskViewType; icon: typeof LayoutGrid; label: string }[] = [
  { value: 'cards', icon: LayoutGrid, label: 'Cards' },
  { value: 'kanban', icon: Columns3, label: 'Kanban' },
  { value: 'list', icon: List, label: 'List' },
]

export function TaskViewToggle({ view, onViewChange }: TaskViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-1">
      {views.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-3 gap-1.5',
            view === value && 'bg-background shadow-sm'
          )}
          onClick={() => onViewChange(value)}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  )
}
