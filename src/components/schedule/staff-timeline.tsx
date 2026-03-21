'use client'

import { useState, useEffect } from 'react'
import { Clock, Filter, Trophy, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/contexts/event-context'
import { getEventDays } from '@/lib/constants'
import type { DayGroup, DayActivity, Match, Attendee } from '@/types'
import { MultiAssignSelect } from './multi-assign-select'


function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start)
  return `${formatTime(start)} — ${formatTime(end)}`
}

function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return ''
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function formatTimeForDB(time: string | null | undefined): string | null {
  if (!time) return null
  if (/^\d{2}:\d{2}:\d{2}/.test(time)) return time
  return `${time}:00`
}

interface StaffTimelineProps {
  userName: string
}

export function StaffTimeline({ userName }: StaffTimelineProps) {
  const { currentEvent } = useEvent()
  const [selectedDate, setSelectedDate] = useState('')
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [filterPerson, setFilterPerson] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Activity form
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null)
  const [activityForm, setActivityForm] = useState({
    group_id: '', start_time: '09:00', end_time: '', activity: '', notes: '',
  })

  // Match form
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [matchForm, setMatchForm] = useState({
    match_number: 1, start_time: '09:00', team_a: '', team_b: '', field: '', referee: '', notes: '',
  })

  // Reset selectedDate when event changes
  useEffect(() => {
    const days = getEventDays(currentEvent)
    if (days.length > 0) {
      setSelectedDate(days[0].date)
    }
  }, [currentEvent?.id])

  useEffect(() => {
    fetchAll()
  }, [selectedDate, currentEvent?.id])

  const fetchAll = async () => {
    if (!currentEvent) return
    setIsLoading(true)
    const eventId = currentEvent.id
    const [groupsRes, activitiesRes, matchesRes, attendeesRes] = await Promise.all([
      supabase.from('showcase_day_groups').select('*').eq('event_id', eventId).order('sort_order'),
      supabase.from('showcase_day_activities').select('*, showcase_day_groups(*)').eq('event_id', eventId).eq('event_date', selectedDate).order('start_time').order('sort_order'),
      supabase.from('showcase_matches').select('*').eq('event_id', eventId).eq('event_date', selectedDate).order('match_number'),
      supabase.from('showcase_attendees').select('*').eq('event_id', eventId).order('name'),
    ])

    if (groupsRes.data) setGroups(groupsRes.data)
    if (activitiesRes.data) {
      setActivities(activitiesRes.data.map((a: any) => ({ ...a, group: a.showcase_day_groups })))
    }
    if (matchesRes.data) setMatches(matchesRes.data)
    if (attendeesRes.data) setAttendees(attendeesRes.data)
    setIsLoading(false)
  }

  // ─── Activity CRUD ────────────────────────────────────────

  const updateActivityResponsible = async (id: string, responsible: string[] | null) => {
    const { error } = await supabase
      .from('showcase_day_activities')
      .update({ responsible, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) { toast.error('Failed to update assignment'); return }
    setActivities(prev => prev.map(a => a.id === id ? { ...a, responsible } : a))
    toast.success('Staff assigned')
  }

  const resetActivityForm = () => {
    setActivityForm({ group_id: '', start_time: '09:00', end_time: '', activity: '', notes: '' })
  }

  const openAddActivity = () => {
    setEditingActivity(null)
    resetActivityForm()
    setIsActivityFormOpen(true)
  }

  const openEditActivity = (activity: DayActivity) => {
    setEditingActivity(activity)
    setActivityForm({
      group_id: activity.group_id || '',
      start_time: formatTimeForInput(activity.start_time),
      end_time: formatTimeForInput(activity.end_time),
      activity: activity.activity,
      notes: activity.notes || '',
    })
    setIsActivityFormOpen(true)
  }

  const handleCreateActivity = async () => {
    const { data, error } = await supabase
      .from('showcase_day_activities')
      .insert([{
        event_id: currentEvent!.id,
        event_date: selectedDate,
        group_id: activityForm.group_id || null,
        start_time: formatTimeForDB(activityForm.start_time),
        end_time: formatTimeForDB(activityForm.end_time),
        activity: activityForm.activity,
        notes: activityForm.notes || null,
        created_by: userName,
      }])
      .select('*, showcase_day_groups(*)')
      .single()

    if (error) { toast.error('Failed to create activity'); return }
    setActivities(prev =>
      [...prev, { ...data, group: data.showcase_day_groups }].sort((a, b) => a.start_time.localeCompare(b.start_time))
    )
    setIsActivityFormOpen(false)
    resetActivityForm()
    toast.success('Activity created')
  }

  const handleUpdateActivity = async () => {
    if (!editingActivity) return
    const { data, error } = await supabase
      .from('showcase_day_activities')
      .update({
        group_id: activityForm.group_id || null,
        start_time: formatTimeForDB(activityForm.start_time),
        end_time: formatTimeForDB(activityForm.end_time),
        activity: activityForm.activity,
        notes: activityForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingActivity.id)
      .select('*, showcase_day_groups(*)')
      .single()

    if (error) { toast.error('Failed to update activity'); return }
    setActivities(prev =>
      prev.map(a => a.id === editingActivity.id ? { ...data, group: data.showcase_day_groups } : a)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    )
    setEditingActivity(null)
    setIsActivityFormOpen(false)
    resetActivityForm()
    toast.success('Activity updated')
  }

  const handleDeleteActivity = async (id: string) => {
    const { error } = await supabase.from('showcase_day_activities').delete().eq('id', id)
    if (error) { toast.error('Failed to delete activity'); return }
    setActivities(prev => prev.filter(a => a.id !== id))
    toast.success('Activity deleted')
  }

  // ─── Match CRUD ───────────────────────────────────────────

  const updateMatchReferee = async (id: string, referee: string[] | null) => {
    const { error } = await supabase
      .from('showcase_matches')
      .update({ referee, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) { toast.error('Failed to update referee'); return }
    setMatches(prev => prev.map(m => m.id === id ? { ...m, referee } : m))
    toast.success('Referee assigned')
  }

  const resetMatchForm = () => {
    const nextNumber = matches.length > 0 ? Math.max(...matches.map(m => m.match_number)) + 1 : 1
    setMatchForm({ match_number: nextNumber, start_time: '09:00', team_a: '', team_b: '', field: '', referee: '', notes: '' })
  }

  const openAddMatch = () => {
    setEditingMatch(null)
    resetMatchForm()
    setIsMatchFormOpen(true)
  }

  const openEditMatch = (match: Match) => {
    setEditingMatch(match)
    setMatchForm({
      match_number: match.match_number,
      start_time: formatTimeForInput(match.start_time),
      team_a: match.team_a,
      team_b: match.team_b,
      field: match.field || '',
      referee: match.referee?.join(', ') || '',
      notes: match.notes || '',
    })
    setIsMatchFormOpen(true)
  }

  const handleCreateMatch = async () => {
    const { data, error } = await supabase
      .from('showcase_matches')
      .insert([{
        event_id: currentEvent!.id,
        event_date: selectedDate,
        match_number: matchForm.match_number,
        start_time: formatTimeForDB(matchForm.start_time),
        team_a: matchForm.team_a,
        team_b: matchForm.team_b,
        field: matchForm.field || null,
        referee: matchForm.referee ? [matchForm.referee] : null,
        notes: matchForm.notes || null,
        created_by: userName,
      }])
      .select()
      .single()

    if (error) { toast.error('Failed to create match'); return }
    setMatches(prev => [...prev, data].sort((a, b) => a.match_number - b.match_number))
    setIsMatchFormOpen(false)
    resetMatchForm()
    toast.success('Match created')
  }

  const handleUpdateMatch = async () => {
    if (!editingMatch) return
    const { error } = await supabase
      .from('showcase_matches')
      .update({
        match_number: matchForm.match_number,
        start_time: formatTimeForDB(matchForm.start_time),
        team_a: matchForm.team_a,
        team_b: matchForm.team_b,
        field: matchForm.field || null,
        referee: matchForm.referee ? [matchForm.referee] : null,
        notes: matchForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingMatch.id)

    if (error) { toast.error('Failed to update match'); return }
    await fetchAll()
    setEditingMatch(null)
    setIsMatchFormOpen(false)
    resetMatchForm()
    toast.success('Match updated')
  }

  const handleDeleteMatch = async (id: string) => {
    const { error } = await supabase.from('showcase_matches').delete().eq('id', id)
    if (error) { toast.error('Failed to delete match'); return }
    setMatches(prev => prev.filter(m => m.id !== id))
    toast.success('Match deleted')
  }

  // ─── Computed data ────────────────────────────────────────

  // Separate activities
  const generalGroup = groups.find(g => g.name === 'General')
  const generalActivities = activities.filter(a => a.group_id === generalGroup?.id).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const groupActivities = activities.filter(a => a.group_id !== generalGroup?.id)

  // Active groups for this day (only groups that have activities)
  const activeGroups = groups
    .filter(g => g.name !== 'General' && groupActivities.some(a => a.group_id === g.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  // Time boundaries
  const groupStart = groupActivities.length > 0 ? groupActivities[0].start_time : '99:99'
  const groupEnd = groupActivities.length > 0
    ? groupActivities.reduce((max, a) => {
        const t = a.end_time || a.start_time
        return t > max ? t : max
      }, '00:00')
    : '00:00'
  const matchStart = matches.length > 0 ? matches[0].start_time : '99:99'

  // When there are no group activities or matches, all general activities go in beforeGroups
  const hasGroups = groupActivities.length > 0
  const hasMatches = matches.length > 0

  const beforeGroups = hasGroups
    ? generalActivities.filter(a => a.start_time < groupStart)
    : generalActivities // all go here when no groups
  const midGeneral = hasGroups
    ? generalActivities.filter(a => a.start_time >= groupEnd && a.start_time < matchStart)
    : []
  const afterAll = (hasGroups || hasMatches)
    ? generalActivities.filter(a => {
        const matchEnd = hasMatches ? matches[matches.length - 1].start_time : '00:00'
        return a.start_time >= matchEnd && a.start_time >= groupEnd && !midGeneral.includes(a) && !beforeGroups.includes(a)
      })
    : []

  // Match times for grouped display
  const matchTimeSlots = [...new Set(matches.map(m => m.start_time))].sort()

  // Filter check
  const isHighlighted = (responsible: string[] | null) => {
    if (filterPerson === 'all') return true
    if (!responsible || responsible.length === 0) return false
    return responsible.some(r => r.toLowerCase().includes(filterPerson.toLowerCase()))
  }

  const isMatchHighlighted = (referee: string[] | null) => {
    if (filterPerson === 'all') return true
    if (!referee || referee.length === 0) return false
    return referee.some(r => r.toLowerCase().includes(filterPerson.toLowerCase()))
  }

  // Unique responsible names from current data (for filter)
  const allResponsible = [
    ...activities.flatMap(a => a.responsible ?? []),
    ...matches.flatMap(m => m.referee ?? []),
  ]
  const uniqueNames = [...new Set(allResponsible)].sort()

  const eventDays = getEventDays(currentEvent)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading schedule...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Staff Schedule
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">My Schedule:</span>
            </div>
            <Select value={filterPerson} onValueChange={setFilterPerson}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                <SelectItem value="all">All Staff</SelectItem>
                {uniqueNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
                {attendees.filter(a => !uniqueNames.includes(a.name)).map(a => (
                  <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {eventDays.length > 1 && (
          <Tabs value={selectedDate} onValueChange={setSelectedDate} className="mt-2">
            <TabsList>
              {eventDays.map(day => (
                <TabsTrigger key={day.date} value={day.date} className="text-sm">
                  {day.label} — {day.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Phase 1: Shared events before groups */}
        {beforeGroups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setup & Check-in</h3>
            <div className="space-y-1.5">
              {beforeGroups.map(a => (
                <SharedActivityRow
                  key={a.id}
                  activity={a}
                  attendees={attendees}
                  highlighted={isHighlighted(a.responsible)}
                  dimmed={filterPerson !== 'all' && !isHighlighted(a.responsible)}
                  onAssign={(val) => updateActivityResponsible(a.id, val)}
                  onEdit={() => openEditActivity(a)}
                  onDelete={() => handleDeleteActivity(a.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: Group activities grid */}
        {activeGroups.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Activities</h3>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openAddActivity}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {(() => {
              // Collect all unique start times and build lookup
              const allStartTimes = [...new Set(groupActivities.map(a => a.start_time))].sort()

              const activityLookup = new Map<string, DayActivity[]>()
              for (const a of groupActivities) {
                const key = `${a.group_id}-${a.start_time}`
                const existing = activityLookup.get(key) || []
                existing.push(a)
                activityLookup.set(key, existing)
              }

              const renderGroupHeader = (group: DayGroup) => (
                <div
                  className="rounded-lg px-3 py-2 text-sm font-semibold border"
                  style={{ backgroundColor: `${group.color}15`, borderColor: `${group.color}40`, color: group.color }}
                >
                  <div>{group.name}</div>
                </div>
              )

              const renderActivityCard = (a: DayActivity, groupColor: string) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  groupColor={groupColor}
                  attendees={attendees}
                  highlighted={isHighlighted(a.responsible)}
                  dimmed={filterPerson !== 'all' && !isHighlighted(a.responsible)}
                  onAssign={(val) => updateActivityResponsible(a.id, val)}
                  onEdit={() => openEditActivity(a)}
                  onDelete={() => handleDeleteActivity(a.id)}
                />
              )

              return (
                <>
                  {/* Mobile/Tablet: stacked per group */}
                  <div className={cn(
                    'grid gap-3 lg:hidden',
                    activeGroups.length >= 3 && 'sm:grid-cols-3',
                    activeGroups.length === 2 && 'sm:grid-cols-2',
                    activeGroups.length === 1 && 'max-w-md',
                  )}>
                    {activeGroups.map(group => {
                      const groupActs = groupActivities
                        .filter(a => a.group_id === group.id)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.sort_order - b.sort_order)
                      return (
                        <div key={group.id} className="space-y-2">
                          {renderGroupHeader(group)}
                          <div className="space-y-1.5">
                            {groupActs.map(a => renderActivityCard(a, group.color))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop: proportional timeline */}
                  {(() => {
                    const toMin = (t: string) => {
                      const [h, m] = t.split(':').map(Number)
                      return h * 60 + m
                    }

                    const allTimes = groupActivities.flatMap(a =>
                      [a.start_time, a.end_time].filter(Boolean) as string[]
                    )
                    if (allTimes.length === 0) return null

                    const startMin = allTimes.reduce((mn, t) => Math.min(mn, toMin(t)), Infinity)
                    const endMin = allTimes.reduce((mx, t) => Math.max(mx, toMin(t)), 0)
                    const rangeMin = endMin - startMin || 60
                    const PX = 4 // pixels per minute
                    const totalHeight = rangeMin * PX

                    // Time markers every 30 min
                    const markers: number[] = []
                    for (let m = Math.ceil(startMin / 30) * 30; m <= endMin; m += 30) {
                      markers.push(m)
                    }

                    return (
                      <div className="hidden lg:block">
                        {/* Headers row */}
                        <div className="flex gap-3 mb-2">
                          <div className="shrink-0 w-14" />
                          {activeGroups.map(group => (
                            <div key={group.id} className="flex-1 min-w-0">
                              {renderGroupHeader(group)}
                            </div>
                          ))}
                        </div>

                        {/* Timeline */}
                        <div className="flex gap-3">
                          {/* Time axis */}
                          <div className="relative shrink-0 w-14" style={{ height: totalHeight }}>
                            {markers.map(m => {
                              const t = `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}:00`
                              return (
                                <div
                                  key={m}
                                  className="absolute right-0 pr-2 text-xs text-muted-foreground tabular-nums -translate-y-1/2"
                                  style={{ top: (m - startMin) * PX }}
                                >
                                  {formatTime(t)}
                                </div>
                              )
                            })}
                          </div>

                          {/* Group columns */}
                          {activeGroups.map(group => {
                            const groupActs = groupActivities
                              .filter(a => a.group_id === group.id)
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))

                            return (
                              <div key={group.id} className="flex-1 min-w-0 relative" style={{ height: totalHeight }}>
                                {/* Grid lines */}
                                {markers.map(m => (
                                  <div
                                    key={m}
                                    className="absolute left-0 right-0 border-t border-dashed border-border/40"
                                    style={{ top: (m - startMin) * PX }}
                                  />
                                ))}

                                {/* Activity cards */}
                                {groupActs.map((a, i) => {
                                  const aStart = toMin(a.start_time) - startMin
                                  const aEnd = a.end_time ? toMin(a.end_time) - startMin : aStart + 15
                                  const top = aStart * PX
                                  const height = Math.max((aEnd - aStart) * PX, 48)

                                  return (
                                    <div
                                      key={a.id}
                                      className="absolute left-0 right-1"
                                      style={{ top, height, zIndex: i + 1 }}
                                    >
                                      {renderActivityCard(a, group.color)}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )
            })()}
          </div>
        )}

        {/* Phase 3: Mid-general (between groups and matches) */}
        {midGeneral.length > 0 && (
          <div className="space-y-1.5">
            {midGeneral.map(a => (
              <SharedActivityRow
                key={a.id}
                activity={a}
                attendees={attendees}
                highlighted={isHighlighted(a.responsible)}
                dimmed={filterPerson !== 'all' && !isHighlighted(a.responsible)}
                onAssign={(val) => updateActivityResponsible(a.id, val)}
                onEdit={() => openEditActivity(a)}
                onDelete={() => handleDeleteActivity(a.id)}
              />
            ))}
          </div>
        )}

        {/* Phase 4: Matches */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                Matches
              </h3>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openAddMatch}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {(() => {
              const fields = [...new Set(matches.map(m => m.field).filter(Boolean))].sort()
              const fieldCount = Math.max(fields.length, 1)
              const gridCols = `100px ${Array(fieldCount).fill('1fr').join(' ')}`
              const gridColsSm = `120px ${Array(fieldCount).fill('1fr').join(' ')}`

              return (
                <div className="rounded-lg border overflow-hidden">
                  {/* Table header */}
                  <div
                    className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    style={{ display: 'grid', gridTemplateColumns: gridColsSm }}
                  >
                    <div className="px-3 py-2 border-r">Time</div>
                    {fields.length > 0 ? fields.map((field, i) => (
                      <div key={field} className={cn('px-3 py-2', i < fields.length - 1 && 'border-r')}>
                        {field}
                      </div>
                    )) : (
                      <div className="px-3 py-2">Match</div>
                    )}
                  </div>
                  {/* Match rows by time slot */}
                  {matchTimeSlots.map((time, idx) => (
                    <div
                      key={time}
                      className={cn('border-t', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}
                      style={{ display: 'grid', gridTemplateColumns: gridColsSm }}
                    >
                      <div className="px-3 py-2.5 border-r text-sm font-medium tabular-nums">
                        {formatTime(time)}
                      </div>
                      {fields.length > 0 ? fields.map((field, i) => {
                        const match = matches.find(m => m.start_time === time && m.field === field)
                        return (
                          <div
                            key={field}
                            className={cn(
                              'px-3 py-2.5',
                              i < fields.length - 1 && 'border-r',
                              filterPerson !== 'all' && match && !isMatchHighlighted(match.referee) && 'opacity-30',
                            )}
                          >
                            {match ? (
                              <MatchCell
                                match={match}
                                attendees={attendees}
                                onAssign={(val) => updateMatchReferee(match.id, val)}
                                onEdit={() => openEditMatch(match)}
                                onDelete={() => handleDeleteMatch(match.id)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        )
                      }) : (() => {
                        const slotMatches = matches.filter(m => m.start_time === time)
                        return slotMatches.length > 0 ? slotMatches.map(match => (
                          <div
                            key={match.id}
                            className={cn(
                              'px-3 py-2.5',
                              filterPerson !== 'all' && !isMatchHighlighted(match.referee) && 'opacity-30',
                            )}
                          >
                            <MatchCell
                              match={match}
                              attendees={attendees}
                              onAssign={(val) => updateMatchReferee(match.id, val)}
                              onEdit={() => openEditMatch(match)}
                              onDelete={() => handleDeleteMatch(match.id)}
                            />
                          </div>
                        )) : (
                          <div className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">—</span>
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* Phase 5: Closing events */}
        {afterAll.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closing</h3>
            <div className="space-y-1.5">
              {afterAll.map(a => (
                <SharedActivityRow
                  key={a.id}
                  activity={a}
                  attendees={attendees}
                  highlighted={isHighlighted(a.responsible)}
                  dimmed={filterPerson !== 'all' && !isHighlighted(a.responsible)}
                  onAssign={(val) => updateActivityResponsible(a.id, val)}
                  onEdit={() => openEditActivity(a)}
                  onDelete={() => handleDeleteActivity(a.id)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Activity Form Dialog */}
      <Dialog key={editingActivity?.id || 'new-activity'} open={isActivityFormOpen} onOpenChange={setIsActivityFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={activityForm.start_time}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={activityForm.end_time}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Group</Label>
              <Select
                value={activityForm.group_id || 'none'}
                onValueChange={(v) => setActivityForm(prev => ({ ...prev, group_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group (General)</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Activity *</Label>
              <Input
                value={activityForm.activity}
                onChange={(e) => setActivityForm(prev => ({ ...prev, activity: e.target.value }))}
                placeholder="What's happening?"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={activityForm.notes}
                onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-2">
              {editingActivity ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteActivity(editingActivity.id)
                    setIsActivityFormOpen(false)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsActivityFormOpen(false)}>Cancel</Button>
                <Button
                  onClick={editingActivity ? handleUpdateActivity : handleCreateActivity}
                  disabled={!activityForm.activity || !activityForm.start_time}
                >
                  {editingActivity ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Form Dialog */}
      <Dialog key={editingMatch?.id || 'new-match'} open={isMatchFormOpen} onOpenChange={setIsMatchFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMatch ? 'Edit Match' : 'Add Match'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Match #</Label>
                <Input
                  type="number"
                  min={1}
                  value={matchForm.match_number}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, match_number: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={matchForm.start_time}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team A *</Label>
                <Input
                  value={matchForm.team_a}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, team_a: e.target.value }))}
                  placeholder="Team name"
                />
              </div>
              <div>
                <Label>Team B *</Label>
                <Input
                  value={matchForm.team_b}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, team_b: e.target.value }))}
                  placeholder="Team name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field</Label>
                <Input
                  value={matchForm.field}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, field: e.target.value }))}
                  placeholder="Field 1, Field 2"
                />
              </div>
              <div>
                <Label>Referee</Label>
                <Input
                  value={matchForm.referee}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, referee: e.target.value }))}
                  placeholder="Referee name"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              {editingMatch ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteMatch(editingMatch.id)
                    setIsMatchFormOpen(false)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsMatchFormOpen(false)}>Cancel</Button>
                <Button
                  onClick={editingMatch ? handleUpdateMatch : handleCreateMatch}
                  disabled={!matchForm.team_a || !matchForm.team_b}
                >
                  {editingMatch ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Sub-components ─────────────────────────────────────────

interface SharedActivityRowProps {
  activity: DayActivity
  attendees: Attendee[]
  highlighted: boolean
  dimmed: boolean
  onAssign: (value: string[] | null) => void
  onEdit: () => void
  onDelete: () => void
}

function SharedActivityRow({ activity, attendees, highlighted, dimmed, onAssign, onEdit, onDelete }: SharedActivityRowProps) {
  return (
    <div className={cn(
      'group flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 transition-opacity',
      dimmed && 'opacity-25',
    )}>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium tabular-nums whitespace-nowrap">
          {formatTimeRange(activity.start_time, activity.end_time)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{activity.activity}</span>
        {activity.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <MultiAssignSelect value={activity.responsible} attendees={attendees} onAssign={onAssign} />
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ActivityCardProps {
  activity: DayActivity
  groupColor: string
  attendees: Attendee[]
  highlighted: boolean
  dimmed: boolean
  onAssign: (value: string[] | null) => void
  onEdit: () => void
  onDelete: () => void
}

function ActivityCard({ activity, groupColor, attendees, highlighted, dimmed, onAssign, onEdit, onDelete }: ActivityCardProps) {
  return (
    <div
      className={cn(
        'group rounded-md border px-2.5 py-2 text-sm transition-opacity h-full overflow-hidden bg-background',
        dimmed && 'opacity-25',
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: groupColor,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tabular-nums text-muted-foreground">
            {formatTimeRange(activity.start_time, activity.end_time)}
          </div>
          <div className="font-medium text-sm leading-tight mt-0.5">{activity.activity}</div>
          {activity.notes && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{activity.notes}</div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted">
            <Edit2 className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-muted">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      </div>
      <div className="mt-1.5">
        <MultiAssignSelect value={activity.responsible} attendees={attendees} onAssign={onAssign} size="xs" />
      </div>
    </div>
  )
}

interface MatchCellProps {
  match: Match
  attendees: Attendee[]
  onAssign: (value: string[] | null) => void
  onEdit: () => void
  onDelete: () => void
}

function MatchCell({ match, attendees, onAssign, onEdit, onDelete }: MatchCellProps) {
  const isSpecial = match.team_b === '—' || match.team_b === '-'

  return (
    <div className="group space-y-1">
      <div className="flex items-start justify-between gap-1">
        <div className="text-sm font-medium">
          {isSpecial ? (
            <span className="text-muted-foreground italic">{match.team_a}</span>
          ) : (
            <>{match.team_a} <span className="text-muted-foreground">vs</span> {match.team_b}</>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted">
            <Edit2 className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-muted">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      </div>
      {match.notes && (
        <div className="text-[11px] text-muted-foreground">{match.notes}</div>
      )}
      <MultiAssignSelect value={match.referee} attendees={attendees} onAssign={onAssign} size="xs" />
    </div>
  )
}
