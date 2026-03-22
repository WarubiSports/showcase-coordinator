'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserCheck, Mail, Phone } from 'lucide-react'
import type { Attendee, AttendeeRole } from '@/types'

interface AttendeesOverviewProps {
  attendees: Attendee[]
  isLoading: boolean
}

const ROLE_CONFIG: Record<AttendeeRole, { label: string; color: string }> = {
  coach: { label: 'Coaches', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  scout: { label: 'Scouts', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  alumni: { label: 'Alumni', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400' },
}

export function AttendeesOverview({ attendees, isLoading }: AttendeesOverviewProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted" />
  }

  // Group by primary role (first role in array)
  const byRole = attendees.reduce<Record<AttendeeRole, Attendee[]>>((acc, a) => {
    const primaryRole = a.roles[0] || 'staff'
    if (!acc[primaryRole]) acc[primaryRole] = []
    acc[primaryRole].push(a)
    return acc
  }, {} as Record<AttendeeRole, Attendee[]>)

  // Order: coaches first (most important for lazy coaches), then scouts, alumni, staff
  const roleOrder: AttendeeRole[] = ['coach', 'scout', 'alumni', 'staff']

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attendees
          </CardTitle>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {attendees.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {attendees.length > 0 ? (
          <div className="space-y-4">
            {roleOrder.map((role) => {
              const group = byRole[role]
              if (!group || group.length === 0) return null

              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs ${ROLE_CONFIG[role].color} border-0`}>
                      {ROLE_CONFIG[role].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({group.length})</span>
                  </div>
                  <div className="space-y-1">
                    {group.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-sm">{attendee.name}</span>
                        <div className="flex items-center gap-1.5">
                          {attendee.email && (
                            <a
                              href={`mailto:${attendee.email}`}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={attendee.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {attendee.phone && (
                            <a
                              href={`tel:${attendee.phone}`}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={attendee.phone}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No attendees added yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
