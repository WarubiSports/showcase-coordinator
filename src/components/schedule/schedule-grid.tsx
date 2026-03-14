'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, X, Edit, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/contexts/event-context'
import { getEventDays } from '@/lib/constants'
import type { ScheduleEvent, Task } from '@/types'
import { CheckCircle2 } from 'lucide-react'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 7) // 7am to 12am (midnight = 24)

const COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
]

const formatHour = (hour: number) => {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour > 12) return `${hour - 12} PM`
  return `${hour} AM`
}

interface EventFormData {
  title: string
  description: string
  event_date: string
  start_time: string
  end_time: string
  color: string
  location: string
}

interface ScheduleGridProps {
  userName: string
}

// Scheduled task type for calendar display
interface ScheduledTask {
  id: string
  title: string
  scheduled_date: string
  scheduled_time: string
  status: string
  assignee: string | null
  category_color: string | null
}

export function ScheduleGrid({ userName }: ScheduleGridProps) {
  const router = useRouter()
  const { currentEvent } = useEvent()
  const DAYS = getEventDays(currentEvent)
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: DAYS[0]?.date || '',
    start_time: '09:00',
    end_time: '10:00',
    color: COLORS[0].value,
    location: '',
  })
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEvents()
    fetchScheduledTasks()
  }, [])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('showcase_schedule')
      .select('*')
      .order('event_date')
      .order('start_time')

    if (error) {
      toast.error('Failed to load schedule')
      return
    }

    setEvents(data || [])
    setIsLoading(false)
  }

  const fetchScheduledTasks = async () => {
    const { data, error } = await supabase
      .from('showcase_tasks')
      .select('id, title, scheduled_date, scheduled_time, status, assignee, show_on_schedule, showcase_categories(color)')
      .not('scheduled_date', 'is', null)
      .not('scheduled_time', 'is', null)
      .neq('show_on_schedule', false)
      .order('scheduled_date')
      .order('scheduled_time')

    if (error) {
      console.error('Failed to load scheduled tasks:', error)
      return
    }

    const tasks: ScheduledTask[] = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      scheduled_date: t.scheduled_date,
      scheduled_time: t.scheduled_time,
      status: t.status,
      assignee: t.assignee,
      category_color: t.showcase_categories?.color || null,
    }))

    setScheduledTasks(tasks)
  }

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from('showcase_schedule')
      .insert([{ ...formData, created_by: userName }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create event')
      return
    }

    setEvents((prev) => [...prev, data])
    setIsFormOpen(false)
    resetForm()
    toast.success('Event created')
  }

  const handleUpdate = async () => {
    if (!editingEvent) return

    const { data, error } = await supabase
      .from('showcase_schedule')
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq('id', editingEvent.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update event')
      return
    }

    setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? data : e)))
    setEditingEvent(null)
    setIsFormOpen(false)
    resetForm()
    toast.success('Event updated')
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('showcase_schedule').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete event')
      return
    }

    setEvents((prev) => prev.filter((e) => e.id !== id))
    toast.success('Event deleted')
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: DAYS[0].date,
      start_time: '09:00',
      end_time: '10:00',
      color: COLORS[0].value,
      location: '',
    })
  }

  const openCreateForm = (date: string, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    const endHour = Math.min(hour + 1, 24)
    const endTime = `${endHour.toString().padStart(2, '0')}:00`

    setFormData({
      ...formData,
      event_date: date,
      start_time: startTime,
      end_time: endTime,
    })
    setEditingEvent(null)
    setIsFormOpen(true)
  }

  const openEditForm = (event: ScheduleEvent) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time.slice(0, 5),
      end_time: event.end_time.slice(0, 5),
      color: event.color,
      location: event.location || '',
    })
    setEditingEvent(event)
    setIsFormOpen(true)
  }

  const handleDragStart = (e: React.DragEvent, event: ScheduleEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, date: string, hour: number) => {
    e.preventDefault()
    if (!draggedEvent) return

    const startHour = parseInt(draggedEvent.start_time.slice(0, 2))
    const endHour = parseInt(draggedEvent.end_time.slice(0, 2))
    const duration = endHour - startHour

    const newStartTime = `${hour.toString().padStart(2, '0')}:00`
    const newEndHour = Math.min(hour + duration, 24)
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:00`

    const { data, error } = await supabase
      .from('showcase_schedule')
      .update({
        event_date: date,
        start_time: newStartTime,
        end_time: newEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draggedEvent.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to move event')
      return
    }

    setEvents((prev) => prev.map((e) => (e.id === draggedEvent.id ? data : e)))
    setDraggedEvent(null)
    toast.success('Event moved')
  }

  const getEventStyle = (event: ScheduleEvent) => {
    const startHour = parseInt(event.start_time.slice(0, 2))
    const startMin = parseInt(event.start_time.slice(3, 5))
    const endHour = parseInt(event.end_time.slice(0, 2))
    const endMin = parseInt(event.end_time.slice(3, 5))

    const top = ((startHour - 7) * 60 + startMin) * (48 / 60) // 48px per hour
    const height = ((endHour - startHour) * 60 + (endMin - startMin)) * (48 / 60)

    return { top: `${top}px`, height: `${Math.max(height, 24)}px` }
  }

  const getEventsForDay = (date: string) => {
    return events.filter((e) => e.event_date === date)
  }

  const getTasksForDay = (date: string) => {
    return scheduledTasks.filter((t) => t.scheduled_date === date)
  }

  const getTaskStyle = (task: ScheduledTask) => {
    const startHour = parseInt(task.scheduled_time.slice(0, 2))
    const startMin = parseInt(task.scheduled_time.slice(3, 5))

    const top = ((startHour - 7) * 60 + startMin) * (48 / 60) // 48px per hour
    const height = 30 // Tasks show as 30px tall (quick items)

    return { top: `${top}px`, height: `${height}px` }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-96 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Event Schedule</CardTitle>
            <Button size="sm" onClick={() => { resetForm(); setEditingEvent(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
                <div className="p-2 text-center text-xs font-medium text-muted-foreground">Time</div>
                {DAYS.map((day) => (
                  <div key={day.date} className="border-l p-2 text-center">
                    <div className="font-semibold text-sm">{day.label}</div>
                    <div className="text-[10px] text-muted-foreground">{day.name}</div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)]" ref={gridRef}>
                {/* Time labels */}
                <div className="border-r">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-12 border-b px-2 text-right text-xs text-muted-foreground"
                    >
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((day) => (
                  <div key={day.date} className="relative border-l">
                    {/* Hour slots */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-12 border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => openCreateForm(day.date, hour)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.date, hour)}
                      />
                    ))}

                    {/* Events */}
                    {getEventsForDay(day.date).map((event) => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, event)}
                        onClick={(e) => { e.stopPropagation(); openEditForm(event); }}
                        className={cn(
                          'absolute left-1 right-1 rounded-md px-2 py-1 text-white text-xs cursor-move overflow-hidden',
                          'hover:ring-2 hover:ring-white/50 transition-shadow',
                          draggedEvent?.id === event.id && 'opacity-50'
                        )}
                        style={{
                          ...getEventStyle(event),
                          backgroundColor: event.color,
                        }}
                      >
                        <div className="flex items-start gap-1">
                          <GripVertical className="h-3 w-3 shrink-0 mt-0.5 opacity-50" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{event.title}</div>
                            {event.location && (
                              <div className="flex items-center gap-1 opacity-80 truncate">
                                <MapPin className="h-2.5 w-2.5" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Scheduled Tasks */}
                    {getTasksForDay(day.date).map((task) => (
                      <div
                        key={`task-${task.id}`}
                        onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${task.id}`); }}
                        className={cn(
                          'absolute left-1 right-1 rounded-md px-2 py-1 text-xs overflow-hidden',
                          'border-2 border-dashed bg-white/90 dark:bg-gray-800/90',
                          'hover:ring-2 hover:ring-primary/50 transition-shadow cursor-pointer',
                          task.status === 'complete' && 'opacity-60'
                        )}
                        style={{
                          ...getTaskStyle(task),
                          borderColor: task.category_color || '#6b7280',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <CheckCircle2
                            className={cn(
                              'h-3 w-3 shrink-0',
                              task.status === 'complete' ? 'text-green-500' : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'font-medium truncate',
                              task.status === 'complete' && 'line-through'
                            )}
                            style={{ color: task.category_color || '#374151' }}
                          >
                            {task.title}
                          </span>
                          {task.assignee && (
                            <span className="text-muted-foreground truncate ml-auto">
                              {task.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event description (optional)"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Select
                  value={formData.event_date}
                  onValueChange={(v) => setFormData({ ...formData, event_date: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.date} value={day.date}>
                        {day.label} - {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: formData.color }}
                        />
                        {COLORS.find((c) => c.value === formData.color)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Location (optional)"
              />
            </div>

            <div className="flex justify-between pt-2">
              {editingEvent ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDelete(editingEvent.id)
                    setIsFormOpen(false)
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingEvent ? handleUpdate : handleCreate}
                  disabled={!formData.title}
                >
                  {editingEvent ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
