'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEvent } from '@/contexts/event-context'
import { getEventDays } from '@/lib/constants'
import type { AttendeeRole } from '@/types'

interface AttendeeFiltersProps {
  role: AttendeeRole | undefined
  search: string
  date: string | undefined
  onRoleChange: (role: AttendeeRole | undefined) => void
  onSearchChange: (search: string) => void
  onDateChange: (date: string | undefined) => void
}

export function AttendeeFilters({
  role,
  search,
  date,
  onRoleChange,
  onSearchChange,
  onDateChange,
}: AttendeeFiltersProps) {
  const { currentEvent } = useEvent()
  const SHOWCASE_DAYS = getEventDays(currentEvent).map(d => ({
    date: d.date,
    label: `${d.label.slice(0, 3)}, ${new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  }))
  const hasFilters = role || search || date

  const clearFilters = () => {
    onRoleChange(undefined)
    onSearchChange('')
    onDateChange(undefined)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search attendees..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={role || 'all'}
        onValueChange={(v) => onRoleChange(v === 'all' ? undefined : (v as AttendeeRole))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
          <SelectItem value="alumni">Alumni</SelectItem>
          <SelectItem value="coach">Coach</SelectItem>
          <SelectItem value="scout">Scout</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={date || 'all'}
        onValueChange={(v) => onDateChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Days</SelectItem>
          {SHOWCASE_DAYS.map((day) => (
            <SelectItem key={day.date} value={day.date}>
              {day.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
