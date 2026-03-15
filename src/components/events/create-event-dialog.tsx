'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEvent } from '@/contexts/event-context'
import { useEvents } from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent, ShowcaseEventType } from '@/types'
import { Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateEventDialogProps {
  open: boolean
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const EVENT_TYPES: { value: ShowcaseEventType; label: string }[] = [
  { value: 'showcase', label: 'Showcase' },
  { value: 'id_camp', label: 'ID Camp' },
  { value: 'futures', label: 'Futures' },
]

export function CreateEventDialog({ open, onClose }: CreateEventDialogProps) {
  const { events, refetchEvents, setCurrentEvent } = useEvent()
  const { createEvent } = useEvents()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [type, setType] = useState<ShowcaseEventType>('showcase')
  const [description, setDescription] = useState('')
  const [cloneFromId, setCloneFromId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const slug = slugify(name + (startDate ? `-${startDate.slice(0, 4)}` : ''))

  const reset = () => {
    setName('')
    setLocation('')
    setStartDate('')
    setEndDate('')
    setStartTime('09:00')
    setType('showcase')
    setDescription('')
    setCloneFromId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !location.trim() || !startDate || !endDate) return

    setIsSubmitting(true)
    try {
      const event = await createEvent({
        name: name.trim(),
        slug,
        location: location.trim(),
        start_date: startDate,
        end_date: endDate,
        start_time: startTime + ':00',
        type,
        description: description.trim() || undefined,
      })

      // Clone tasks from source event if selected
      if (cloneFromId) {
        await cloneTasks(cloneFromId, event.id)
      }

      await refetchEvents()
      setCurrentEvent(event)
      toast.success(`Event "${event.name}" created`)
      reset()
      onClose()
    } catch (err) {
      console.error('Failed to create event:', err)
      toast.error('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Set up a new showcase or camp. You can clone tasks from a previous event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="e.g. Warubi Futures - Dallas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Link: /event/<span className="font-mono">{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="e.g. Dallas, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-start">Start Date</Label>
              <Input
                id="event-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || e.target.value > endDate) setEndDate(e.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">End Date</Label>
              <Input
                id="event-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-time">Start Time</Label>
              <Input
                id="event-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <select
                id="event-type"
                value={type}
                onChange={(e) => setType(e.target.value as ShowcaseEventType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Input
              id="event-description"
              placeholder="Brief description of the event"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Clone tasks */}
          {events.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Clone Tasks From</Label>
              </div>
              <select
                value={cloneFromId}
                onChange={(e) => setCloneFromId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Start fresh (no tasks)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} — {ev.location}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Copies all tasks with their categories and priorities. Status resets to &quot;Not Started&quot;.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim() || !location.trim() || !startDate || !endDate}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function cloneTasks(sourceEventId: string, targetEventId: string) {
  const { data: sourceTasks, error } = await supabase
    .from('showcase_tasks')
    .select('title, description, category_id, priority, assignee, scheduled_date, scheduled_time, show_on_schedule, dependencies')
    .eq('event_id', sourceEventId)

  if (error || !sourceTasks?.length) return

  const cloned = sourceTasks.map(task => ({
    ...task,
    event_id: targetEventId,
    status: 'not_started' as const,
    progress: 0,
    created_by: null,
    scheduled_date: null,
    scheduled_time: null,
  }))

  await supabase.from('showcase_tasks').insert(cloned)
}
