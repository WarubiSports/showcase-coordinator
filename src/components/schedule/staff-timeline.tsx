'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Filter, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { DayGroup, DayActivity, Match, Attendee } from '@/types'

const EVENT_DAYS = [
  { date: '2026-02-07', label: 'Saturday', name: 'Event Day 1' },
  { date: '2026-02-08', label: 'Sunday', name: 'Event Day 2' },
]

// Subtitle info for groups (not stored in DB)
const GROUP_SUBTITLES: Record<string, string> = {
  'Group A': 'Team 4 & 5 + GK + Women',
  'Group B': 'Team 1, 2, 3',
  'GK+Women Training': 'Field 2',
  'Women': 'Women\'s Program',
  'Sunday Only': 'Players, Women, GK',
  'Both Days Men': '+ ITP & BMG',
  'Both Days Women': '+ DJK',
}

function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start)
  return `${formatTime(start)} — ${formatTime(end)}`
}

interface StaffTimelineProps {
  userName: string
}

export function StaffTimeline({ userName }: StaffTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(EVENT_DAYS[0].date)
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [filterPerson, setFilterPerson] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [selectedDate])

  const fetchAll = async () => {
    setIsLoading(true)
    const [groupsRes, activitiesRes, matchesRes, attendeesRes] = await Promise.all([
      supabase.from('showcase_day_groups').select('*').order('sort_order'),
      supabase.from('showcase_day_activities').select('*, showcase_day_groups(*)').eq('event_date', selectedDate).order('start_time').order('sort_order'),
      supabase.from('showcase_matches').select('*').eq('event_date', selectedDate).order('match_number'),
      supabase.from('showcase_attendees').select('*').order('name'),
    ])

    if (groupsRes.data) setGroups(groupsRes.data)
    if (activitiesRes.data) {
      setActivities(activitiesRes.data.map((a: any) => ({ ...a, group: a.showcase_day_groups })))
    }
    if (matchesRes.data) setMatches(matchesRes.data)
    if (attendeesRes.data) setAttendees(attendeesRes.data)
    setIsLoading(false)
  }

  const updateActivityResponsible = async (id: string, responsible: string | null) => {
    const { error } = await supabase
      .from('showcase_day_activities')
      .update({ responsible, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update assignment')
      return
    }

    setActivities(prev => prev.map(a => a.id === id ? { ...a, responsible } : a))
    toast.success('Staff assigned')
  }

  const updateMatchReferee = async (id: string, referee: string | null) => {
    const { error } = await supabase
      .from('showcase_matches')
      .update({ referee, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update referee')
      return
    }

    setMatches(prev => prev.map(m => m.id === id ? { ...m, referee } : m))
    toast.success('Referee assigned')
  }

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

  const beforeGroups = generalActivities.filter(a => a.start_time < groupStart)
  const midGeneral = generalActivities.filter(a => a.start_time >= groupEnd && a.start_time < matchStart)
  const afterAll = generalActivities.filter(a => {
    const matchEnd = matches.length > 0 ? matches[matches.length - 1].start_time : '00:00'
    return a.start_time >= matchEnd && a.start_time >= groupEnd && !midGeneral.includes(a) && !beforeGroups.includes(a)
  })

  // Match times for grouped display
  const matchTimeSlots = [...new Set(matches.map(m => m.start_time))].sort()

  // Filter check
  const isHighlighted = (responsible: string | null) => {
    if (filterPerson === 'all') return true
    if (!responsible) return false
    return responsible.toLowerCase().includes(filterPerson.toLowerCase())
  }

  const isMatchHighlighted = (referee: string | null) => {
    if (filterPerson === 'all') return true
    if (!referee) return false
    return referee.toLowerCase().includes(filterPerson.toLowerCase())
  }

  // Unique responsible names from current data (for filter)
  const allResponsible = [
    ...activities.map(a => a.responsible).filter(Boolean),
    ...matches.map(m => m.referee).filter(Boolean),
  ] as string[]
  const uniqueNames = [...new Set(allResponsible)].sort()

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
              <SelectContent>
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
        <Tabs value={selectedDate} onValueChange={setSelectedDate} className="mt-2">
          <TabsList>
            {EVENT_DAYS.map(day => (
              <TabsTrigger key={day.date} value={day.date} className="text-sm">
                {day.label} — {day.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: Group activities grid */}
        {activeGroups.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Activities</h3>

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
                  {GROUP_SUBTITLES[group.name] && (
                    <div className="text-xs font-normal opacity-70 mt-0.5">{GROUP_SUBTITLES[group.name]}</div>
                  )}
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

                  {/* Desktop: time-aligned grid */}
                  <div
                    className="hidden lg:grid gap-x-3 gap-y-1.5 items-start"
                    style={{ gridTemplateColumns: `repeat(${activeGroups.length}, minmax(0, 1fr))` }}
                  >
                    {activeGroups.map(group => (
                      <div key={group.id}>{renderGroupHeader(group)}</div>
                    ))}

                    {allStartTimes.flatMap(time =>
                      activeGroups.map(group => {
                        const acts = (activityLookup.get(`${group.id}-${time}`) || [])
                          .sort((a, b) => a.sort_order - b.sort_order)
                        return (
                          <div key={`${group.id}-${time}`}>
                            {acts.map(a => renderActivityCard(a, group.color))}
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Phase 3: Mid-general (between groups and matches, e.g. "Warm Up for Games") */}
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
              />
            ))}
          </div>
        )}

        {/* Phase 4: Matches */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Matches
            </h3>
            <div className="rounded-lg border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[120px_1fr_1fr] bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="px-3 py-2 border-r">Time</div>
                <div className="px-3 py-2 border-r">Field 1</div>
                <div className="px-3 py-2">Field 2</div>
              </div>
              {/* Match rows by time slot */}
              {matchTimeSlots.map((time, idx) => {
                const field1 = matches.find(m => m.start_time === time && m.field === 'Field 1')
                const field2 = matches.find(m => m.start_time === time && m.field === 'Field 2')

                return (
                  <div
                    key={time}
                    className={cn(
                      'grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[120px_1fr_1fr] border-t',
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    )}
                  >
                    <div className="px-3 py-2.5 border-r text-sm font-medium tabular-nums">
                      {formatTime(time)}
                    </div>
                    <div className={cn('px-3 py-2.5 border-r', filterPerson !== 'all' && field1 && !isMatchHighlighted(field1.referee) && 'opacity-30')}>
                      {field1 ? (
                        <MatchCell match={field1} attendees={attendees} onAssign={(val) => updateMatchReferee(field1.id, val)} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className={cn('px-3 py-2.5', filterPerson !== 'all' && field2 && !isMatchHighlighted(field2.referee) && 'opacity-30')}>
                      {field2 ? (
                        <MatchCell match={field2} attendees={attendees} onAssign={(val) => updateMatchReferee(field2.id, val)} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Sub-components ─────────────────────────────────────────

interface AssignSelectProps {
  value: string | null
  attendees: Attendee[]
  onAssign: (value: string | null) => void
  size?: 'sm' | 'xs'
}

function AssignSelect({ value, attendees, onAssign, size = 'sm' }: AssignSelectProps) {
  return (
    <Select
      value={value || '_none'}
      onValueChange={(v) => onAssign(v === '_none' ? null : v)}
    >
      <SelectTrigger className={cn(
        'border-dashed',
        size === 'xs' ? 'h-6 text-[11px] w-[120px]' : 'h-7 text-xs w-[140px]',
        !value && 'text-muted-foreground',
      )}>
        <div className="flex items-center gap-1 truncate">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{value || 'Assign...'}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Unassigned</SelectItem>
        {attendees.map(a => (
          <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface SharedActivityRowProps {
  activity: DayActivity
  attendees: Attendee[]
  highlighted: boolean
  dimmed: boolean
  onAssign: (value: string | null) => void
}

function SharedActivityRow({ activity, attendees, highlighted, dimmed, onAssign }: SharedActivityRowProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 transition-opacity',
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
      <AssignSelect value={activity.responsible} attendees={attendees} onAssign={onAssign} />
    </div>
  )
}

interface ActivityCardProps {
  activity: DayActivity
  groupColor: string
  attendees: Attendee[]
  highlighted: boolean
  dimmed: boolean
  onAssign: (value: string | null) => void
}

function ActivityCard({ activity, groupColor, attendees, highlighted, dimmed, onAssign }: ActivityCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-2 text-sm transition-opacity',
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
      </div>
      <div className="mt-1.5">
        <AssignSelect value={activity.responsible} attendees={attendees} onAssign={onAssign} size="xs" />
      </div>
    </div>
  )
}

interface MatchCellProps {
  match: Match
  attendees: Attendee[]
  onAssign: (value: string | null) => void
}

function MatchCell({ match, attendees, onAssign }: MatchCellProps) {
  const isSpecial = match.team_b === '—' || match.team_b === '-'

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">
        {isSpecial ? (
          <span className="text-muted-foreground italic">{match.team_a}</span>
        ) : (
          <>{match.team_a} <span className="text-muted-foreground">vs</span> {match.team_b}</>
        )}
      </div>
      {match.notes && (
        <div className="text-[11px] text-muted-foreground">{match.notes}</div>
      )}
      <AssignSelect value={match.referee} attendees={attendees} onAssign={onAssign} size="xs" />
    </div>
  )
}
