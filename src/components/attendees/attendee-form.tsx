'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Attendee, AttendeeRole, AttendeeAvailability } from '@/types'

// Full week of the showcase: Feb 2-8, 2026
const SHOWCASE_DAYS = [
  { date: '2026-02-02', label: 'Mon, Feb 2' },
  { date: '2026-02-03', label: 'Tue, Feb 3' },
  { date: '2026-02-04', label: 'Wed, Feb 4' },
  { date: '2026-02-05', label: 'Thu, Feb 5' },
  { date: '2026-02-06', label: 'Fri, Feb 6' },
  { date: '2026-02-07', label: 'Sat, Feb 7' },
  { date: '2026-02-08', label: 'Sun, Feb 8' },
]

const ROLES: { value: AttendeeRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'coach', label: 'Coach' },
  { value: 'scout', label: 'Scout' },
]

interface AttendeeFormData {
  name: string
  email: string
  role: AttendeeRole
  phone: string
  notes: string
  availability: AttendeeAvailability[]
}

interface AttendeeFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AttendeeFormData) => Promise<void>
  attendee?: Attendee | null
}

export function AttendeeForm({ open, onClose, onSubmit, attendee }: AttendeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<AttendeeFormData>({
    name: '',
    email: '',
    role: 'staff',
    phone: '',
    notes: '',
    availability: [],
  })

  useEffect(() => {
    if (attendee) {
      setFormData({
        name: attendee.name,
        email: attendee.email || '',
        role: attendee.role,
        phone: attendee.phone || '',
        notes: attendee.notes || '',
        availability: attendee.availability || [],
      })
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'staff',
        phone: '',
        notes: '',
        availability: [],
      })
    }
  }, [attendee, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleDayAvailability = (date: string, checked: boolean) => {
    if (checked) {
      // Add default availability for this day (9am - 6pm)
      setFormData({
        ...formData,
        availability: [
          ...formData.availability,
          { date, start_time: '09:00', end_time: '18:00' },
        ],
      })
    } else {
      // Remove all availability for this day
      setFormData({
        ...formData,
        availability: formData.availability.filter((a) => a.date !== date),
      })
    }
  }

  const updateDayTime = (date: string, field: 'start_time' | 'end_time', value: string) => {
    setFormData({
      ...formData,
      availability: formData.availability.map((a) =>
        a.date === date ? { ...a, [field]: value } : a
      ),
    })
  }

  const isDaySelected = (date: string) => {
    return formData.availability.some((a) => a.date === date)
  }

  const getDayAvailability = (date: string) => {
    return formData.availability.find((a) => a.date === date)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{attendee ? 'Edit Attendee' : 'Add Attendee'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(v: AttendeeRole) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Availability (Feb 2-8, 2026)</Label>
            <div className="space-y-2 rounded-lg border p-3">
              {SHOWCASE_DAYS.map((day) => {
                const isSelected = isDaySelected(day.date)
                const availability = getDayAvailability(day.date)

                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <Checkbox
                      id={`day-${day.date}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleDayAvailability(day.date, checked as boolean)}
                    />
                    <label
                      htmlFor={`day-${day.date}`}
                      className="text-sm font-medium w-24 cursor-pointer"
                    >
                      {day.label}
                    </label>

                    {isSelected && availability && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={availability.start_time}
                          onChange={(e) => updateDayTime(day.date, 'start_time', e.target.value)}
                          className="w-28 h-8 text-xs"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={availability.end_time}
                          onChange={(e) => updateDayTime(day.date, 'end_time', e.target.value)}
                          className="w-28 h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Saving...' : attendee ? 'Update' : 'Add Attendee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
