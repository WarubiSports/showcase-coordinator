'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { AttendeeList } from '@/components/attendees/attendee-list'
import { AttendeeForm } from '@/components/attendees/attendee-form'
import { AttendeeFilters } from '@/components/attendees/attendee-filters'
import { useAttendees } from '@/hooks/use-attendees'
import { useUser } from '@/hooks/use-user'
import { useEvent } from '@/contexts/event-context'
import type { Attendee, AttendeeRole, AttendeeAvailability } from '@/types'

export default function AttendeesPage() {
  const { userName } = useUser()
  const { currentEvent } = useEvent()
  const [roleFilter, setRoleFilter] = useState<AttendeeRole | undefined>()
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFilter, setDateFilter] = useState<string | undefined>()

  const { attendees, isLoading, createAttendee, updateAttendee, deleteAttendee } = useAttendees(currentEvent?.id, {
    role: roleFilter,
    search: searchFilter,
    date: dateFilter,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null)

  const handleCreate = async (data: {
    name: string
    email: string
    roles: AttendeeRole[]
    phone: string
    notes: string
    availability: AttendeeAvailability[]
  }) => {
    try {
      await createAttendee({
        ...data,
        created_by: userName || 'Unknown',
      })
      toast.success('Attendee added successfully')
    } catch {
      toast.error('Failed to add attendee')
      throw new Error('Failed to add attendee')
    }
  }

  const handleUpdate = async (data: {
    name: string
    email: string
    roles: AttendeeRole[]
    phone: string
    notes: string
    availability: AttendeeAvailability[]
  }) => {
    if (!editingAttendee) return
    try {
      await updateAttendee(editingAttendee.id, data)
      toast.success('Attendee updated successfully')
      setEditingAttendee(null)
    } catch {
      toast.error('Failed to update attendee')
      throw new Error('Failed to update attendee')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return
    try {
      await deleteAttendee(id)
      toast.success('Attendee removed')
    } catch {
      toast.error('Failed to remove attendee')
    }
  }

  const handleEdit = (attendee: Attendee) => {
    setEditingAttendee(attendee)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingAttendee(null)
  }

  // Count by role (attendees can have multiple roles)
  const staffCount = attendees.filter((a) => a.roles?.includes('staff')).length
  const alumniCount = attendees.filter((a) => a.roles?.includes('alumni')).length
  const coachCount = attendees.filter((a) => a.roles?.includes('coach')).length
  const scoutCount = attendees.filter((a) => a.roles?.includes('scout')).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attendees</h1>
            <p className="text-muted-foreground">
              Manage staff, alumni, coaches, and scouts for the showcase
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Attendee
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{staffCount}</div>
            <div className="text-xs text-muted-foreground">Staff</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-purple-500">{alumniCount}</div>
            <div className="text-xs text-muted-foreground">Alumni</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{coachCount}</div>
            <div className="text-xs text-muted-foreground">Coaches</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{scoutCount}</div>
            <div className="text-xs text-muted-foreground">Scouts</div>
          </div>
        </div>

        <AttendeeFilters
          role={roleFilter}
          search={searchFilter}
          date={dateFilter}
          onRoleChange={setRoleFilter}
          onSearchChange={setSearchFilter}
          onDateChange={setDateFilter}
        />

        <AttendeeList
          attendees={attendees}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <AttendeeForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingAttendee ? handleUpdate : handleCreate}
          attendee={editingAttendee}
        />
      </div>
    </AppShell>
  )
}
