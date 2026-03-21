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
import type { ShowcaseEventType } from '@/types'
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
      // Geocode the location
      let venue_lat: number | undefined
      let venue_lng: number | undefined
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1`,
          { headers: { 'User-Agent': 'ShowcaseCoordinator/1.0' } }
        )
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          venue_lat = parseFloat(geoData[0].lat)
          venue_lng = parseFloat(geoData[0].lon)
        }
      } catch {
        // Geocoding is best-effort
      }

      const event = await createEvent({
        name: name.trim(),
        slug,
        location: location.trim(),
        start_date: startDate,
        end_date: endDate,
        start_time: startTime + ':00',
        type,
        description: description.trim() || undefined,
        venue_lat,
        venue_lng,
      })

      if (cloneFromId) {
        await cloneEventData(cloneFromId, event.id, startDate, endDate)
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
            Set up a new showcase or camp. You can clone tasks and schedule from a previous event.
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

          {/* Clone from previous event */}
          {events.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Clone From Previous Event</Label>
              </div>
              <select
                value={cloneFromId}
                onChange={(e) => setCloneFromId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Start fresh</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} — {ev.location}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Copies tasks, day schedule, matches, and materials. Dates shift to match your new event. Statuses and scores reset.
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

/**
 * Clone all operational data from a source event to a new target event.
 * - Tasks: cloned with status reset to not_started
 * - Day groups: cloned, IDs remapped for activities
 * - Day activities: cloned with dates shifted to new event
 * - Matches: cloned with dates shifted, scores reset
 * - Materials: cloned with is_ready reset
 */
async function cloneEventData(
  sourceEventId: string,
  targetEventId: string,
  targetStartDate: string,
  targetEndDate: string,
) {
  // 1. Clone tasks
  const { data: sourceTasks } = await supabase
    .from('showcase_tasks')
    .select('title, description, category_id, priority, assignee, show_on_schedule, dependencies')
    .eq('event_id', sourceEventId)

  if (sourceTasks?.length) {
    await supabase.from('showcase_tasks').insert(
      sourceTasks.map(task => ({
        ...task,
        event_id: targetEventId,
        status: 'not_started' as const,
        progress: 0,
      }))
    )
  }

  // 2. Clone day groups (and build ID mapping)
  // First, delete the default groups that createEvent already seeded
  await supabase
    .from('showcase_day_groups')
    .delete()
    .eq('event_id', targetEventId)

  const { data: sourceGroups } = await supabase
    .from('showcase_day_groups')
    .select('id, name, color, sort_order')
    .eq('event_id', sourceEventId)
    .order('sort_order')

  const groupIdMap: Record<string, string> = {}

  if (sourceGroups?.length) {
    const { data: newGroups } = await supabase
      .from('showcase_day_groups')
      .insert(
        sourceGroups.map(g => ({
          name: g.name,
          color: g.color,
          sort_order: g.sort_order,
          event_id: targetEventId,
        }))
      )
      .select('id, name, sort_order')

    // Map old group IDs to new ones by matching sort_order
    if (newGroups) {
      for (const oldGroup of sourceGroups) {
        const newGroup = newGroups.find(ng => ng.name === oldGroup.name)
        if (newGroup) groupIdMap[oldGroup.id] = newGroup.id
      }
    }
  }

  // 3. Build date mapping: source day N → target day N
  const { data: sourceEvent } = await supabase
    .from('showcase_events')
    .select('start_date, end_date')
    .eq('id', sourceEventId)
    .single()

  const dateMap: Record<string, string> = {}
  if (sourceEvent) {
    const srcStart = new Date(sourceEvent.start_date + 'T00:00:00')
    const tgtStart = new Date(targetStartDate + 'T00:00:00')
    const tgtEnd = new Date(targetEndDate + 'T00:00:00')
    const srcEnd = new Date(sourceEvent.end_date + 'T00:00:00')

    let dayIndex = 0
    for (let d = new Date(srcStart); d <= srcEnd; d.setDate(d.getDate() + 1)) {
      const targetDay = new Date(tgtStart)
      targetDay.setDate(targetDay.getDate() + dayIndex)
      // Only map if target day is within the new event's range
      if (targetDay <= tgtEnd) {
        dateMap[d.toISOString().split('T')[0]] = targetDay.toISOString().split('T')[0]
      }
      dayIndex++
    }
  }

  // 4. Clone day activities
  const { data: sourceActivities } = await supabase
    .from('showcase_day_activities')
    .select('event_date, group_id, start_time, end_time, activity, responsible, todos, notes, sort_order')
    .eq('event_id', sourceEventId)

  if (sourceActivities?.length) {
    const clonedActivities = sourceActivities
      .filter(a => dateMap[a.event_date]) // only clone days that fit
      .map(a => ({
        ...a,
        event_id: targetEventId,
        event_date: dateMap[a.event_date],
        group_id: a.group_id ? groupIdMap[a.group_id] || null : null,
      }))

    if (clonedActivities.length) {
      await supabase.from('showcase_day_activities').insert(clonedActivities)
    }
  }

  // 5. Clone matches
  const { data: sourceMatches } = await supabase
    .from('showcase_matches')
    .select('event_date, match_number, start_time, team_a, team_b, field, referee, notes')
    .eq('event_id', sourceEventId)

  if (sourceMatches?.length) {
    const clonedMatches = sourceMatches
      .filter(m => dateMap[m.event_date])
      .map(m => ({
        ...m,
        event_id: targetEventId,
        event_date: dateMap[m.event_date],
        score_a: null,
        score_b: null,
      }))

    if (clonedMatches.length) {
      await supabase.from('showcase_matches').insert(clonedMatches)
    }
  }

  // 6. Clone materials
  const { data: sourceMaterials } = await supabase
    .from('showcase_materials')
    .select('item, category, responsible, notes, sort_order')
    .eq('event_id', sourceEventId)

  if (sourceMaterials?.length) {
    await supabase.from('showcase_materials').insert(
      sourceMaterials.map(m => ({
        ...m,
        event_id: targetEventId,
        is_ready: false,
      }))
    )
  }
}
