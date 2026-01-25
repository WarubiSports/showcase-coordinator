'use client'

import { User, Mail, Phone, Edit, Trash2, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Attendee, AttendeeRole } from '@/types'

const ROLE_COLORS: Record<AttendeeRole, string> = {
  staff: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  alumni: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  coach: 'bg-green-500/20 text-green-400 border-green-500/30',
  scout: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const ROLE_LABELS: Record<AttendeeRole, string> = {
  staff: 'Staff',
  alumni: 'Alumni',
  coach: 'Coach',
  scout: 'Scout',
}

interface AttendeeListProps {
  attendees: Attendee[]
  isLoading: boolean
  onEdit: (attendee: Attendee) => void
  onDelete: (id: string) => void
}

export function AttendeeList({ attendees, isLoading, onEdit, onDelete }: AttendeeListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (attendees.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No attendees yet</h3>
          <p className="text-muted-foreground text-sm">Add staff, alumni, coaches, and scouts attending the showcase.</p>
        </CardContent>
      </Card>
    )
  }

  const formatAvailability = (attendee: Attendee) => {
    if (!attendee.availability || attendee.availability.length === 0) {
      return 'No availability set'
    }

    const dates = [...new Set(attendee.availability.map((a) => a.date))].sort()
    return dates.map((d) => {
      const date = new Date(d + 'T12:00:00')
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }).join(', ')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {attendees.map((attendee) => (
        <Card key={attendee.id} className="group relative">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {attendee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{attendee.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(attendee.roles || []).map((role) => (
                      <Badge key={role} variant="outline" className={ROLE_COLORS[role]}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(attendee)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(attendee.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {attendee.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{attendee.email}</span>
                </div>
              )}
              {attendee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{attendee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span className="truncate">{formatAvailability(attendee)}</span>
              </div>
            </div>

            {attendee.notes && (
              <p className="mt-3 text-xs text-muted-foreground border-t pt-2">{attendee.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
