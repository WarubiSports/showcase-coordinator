'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, X, Clock, Users, Package, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { DayGroup, DayActivity, Match, Material } from '@/types'

const EVENT_DAYS = [
  { date: '2026-02-06', label: 'Friday', name: 'Kick-off Day' },
  { date: '2026-02-07', label: 'Saturday', name: 'Event Day 1' },
  { date: '2026-02-08', label: 'Sunday', name: 'Event Day 2' },
]

const MATERIAL_CATEGORIES = [
  'Equipment',
  'Signage',
  'Catering',
  'Medical',
  'Tech/AV',
  'Apparel',
  'Other',
]

interface DayScheduleViewProps {
  userName: string
}

export function DayScheduleView({ userName }: DayScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(EVENT_DAYS[1].date) // Default to Saturday
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false)
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false)
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  // Form data
  const [activityForm, setActivityForm] = useState({
    group_id: '',
    start_time: '09:00',
    end_time: '',
    activity: '',
    responsible: '',
    todos: '',
    notes: '',
  })

  const [matchForm, setMatchForm] = useState({
    match_number: 1,
    start_time: '09:00',
    team_a: '',
    team_b: '',
    field: '',
    referee: '',
  })

  const [materialForm, setMaterialForm] = useState({
    item: '',
    category: '',
    responsible: '',
    notes: '',
  })

  useEffect(() => {
    fetchGroups()
    fetchMaterials()
  }, [])

  useEffect(() => {
    fetchActivities()
    fetchMatches()
  }, [selectedDate])

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('showcase_day_groups')
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('Failed to load groups:', error)
      return
    }
    setGroups(data || [])
  }

  const fetchActivities = async () => {
    setIsLoading(true)
    console.log('Fetching activities for date:', selectedDate)

    const { data, error } = await supabase
      .from('showcase_day_activities')
      .select('*, showcase_day_groups(*)')
      .eq('event_date', selectedDate)
      .order('start_time')
      .order('sort_order')

    if (error) {
      console.error('Failed to load activities:', error)
      setIsLoading(false)
      return
    }

    console.log('Fetched activities:', data?.map(a => ({ id: a.id, activity: a.activity, start_time: a.start_time, end_time: a.end_time })))

    const mapped = (data || []).map((a: any) => ({
      ...a,
      group: a.showcase_day_groups,
    }))
    setActivities(mapped)
    setIsLoading(false)
  }

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('showcase_matches')
      .select('*')
      .eq('event_date', selectedDate)
      .order('match_number')

    if (error) {
      console.error('Failed to load matches:', error)
      return
    }
    setMatches(data || [])
  }

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('showcase_materials')
      .select('*')
      .order('sort_order')
      .order('item')

    if (error) {
      console.error('Failed to load materials:', error)
      return
    }
    setMaterials(data || [])
  }

  // Activity CRUD
  const handleCreateActivity = async () => {
    const { data, error } = await supabase
      .from('showcase_day_activities')
      .insert([{
        event_date: selectedDate,
        group_id: activityForm.group_id || null,
        start_time: formatTimeForDB(activityForm.start_time),
        end_time: formatTimeForDB(activityForm.end_time),
        activity: activityForm.activity,
        responsible: activityForm.responsible || null,
        todos: activityForm.todos || null,
        notes: activityForm.notes || null,
        created_by: userName,
      }])
      .select('*, showcase_day_groups(*)')
      .single()

    if (error) {
      toast.error('Failed to create activity')
      return
    }

    setActivities((prev) => [...prev, { ...data, group: data.showcase_day_groups }].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    ))
    setIsActivityFormOpen(false)
    resetActivityForm()
    toast.success('Activity created')
  }

  const handleUpdateActivity = async () => {
    if (!editingActivity) return

    console.log('Updating activity:', editingActivity.id)
    console.log('Form values:', {
      start_time: formatTimeForDB(activityForm.start_time),
      end_time: formatTimeForDB(activityForm.end_time),
    })

    const { data, error } = await supabase
      .from('showcase_day_activities')
      .update({
        group_id: activityForm.group_id || null,
        start_time: formatTimeForDB(activityForm.start_time),
        end_time: formatTimeForDB(activityForm.end_time),
        activity: activityForm.activity,
        responsible: activityForm.responsible || null,
        todos: activityForm.todos || null,
        notes: activityForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingActivity.id)
      .select()

    console.log('Update result:', data, error)

    if (error) {
      toast.error('Failed to update activity')
      return
    }

    if (!data || data.length === 0) {
      console.error('Update returned no rows - activity may not exist or RLS issue')
      toast.error('Activity not found')
      return
    }

    // Close dialog first, then refetch
    setEditingActivity(null)
    setIsActivityFormOpen(false)
    resetActivityForm()

    // Refetch to ensure UI is in sync
    await fetchActivities()
    toast.success('Activity updated')
  }

  const handleDeleteActivity = async (id: string) => {
    const { error } = await supabase.from('showcase_day_activities').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete activity')
      return
    }
    setActivities((prev) => prev.filter((a) => a.id !== id))
    toast.success('Activity deleted')
  }

  const resetActivityForm = () => {
    setActivityForm({
      group_id: '',
      start_time: '09:00',
      end_time: '',
      activity: '',
      responsible: '',
      todos: '',
      notes: '',
    })
  }

  const openEditActivity = (activity: DayActivity) => {
    setEditingActivity(activity)
    setActivityForm({
      group_id: activity.group_id || '',
      start_time: formatTimeForInput(activity.start_time),
      end_time: formatTimeForInput(activity.end_time),
      activity: activity.activity,
      responsible: activity.responsible || '',
      todos: activity.todos || '',
      notes: activity.notes || '',
    })
    setIsActivityFormOpen(true)
  }

  // Match CRUD
  const handleCreateMatch = async () => {
    const { data, error } = await supabase
      .from('showcase_matches')
      .insert([{
        event_date: selectedDate,
        match_number: matchForm.match_number,
        start_time: formatTimeForDB(matchForm.start_time),
        team_a: matchForm.team_a,
        team_b: matchForm.team_b,
        field: matchForm.field || null,
        referee: matchForm.referee || null,
        created_by: userName,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create match')
      return
    }

    setMatches((prev) => [...prev, data].sort((a, b) => a.match_number - b.match_number))
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
        referee: matchForm.referee || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingMatch.id)

    if (error) {
      toast.error('Failed to update match')
      return
    }

    await fetchMatches()
    setEditingMatch(null)
    setIsMatchFormOpen(false)
    resetMatchForm()
    toast.success('Match updated')
  }

  const handleDeleteMatch = async (id: string) => {
    const { error } = await supabase.from('showcase_matches').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete match')
      return
    }
    setMatches((prev) => prev.filter((m) => m.id !== id))
    toast.success('Match deleted')
  }

  const resetMatchForm = () => {
    const nextNumber = matches.length > 0 ? Math.max(...matches.map(m => m.match_number)) + 1 : 1
    setMatchForm({
      match_number: nextNumber,
      start_time: '09:00',
      team_a: '',
      team_b: '',
      field: '',
      referee: '',
    })
  }

  const openEditMatch = (match: Match) => {
    setEditingMatch(match)
    setMatchForm({
      match_number: match.match_number,
      start_time: formatTimeForInput(match.start_time),
      team_a: match.team_a,
      team_b: match.team_b,
      field: match.field || '',
      referee: match.referee || '',
    })
    setIsMatchFormOpen(true)
  }

  // Material CRUD
  const handleCreateMaterial = async () => {
    const { data, error } = await supabase
      .from('showcase_materials')
      .insert([{
        item: materialForm.item,
        category: materialForm.category || null,
        responsible: materialForm.responsible || null,
        notes: materialForm.notes || null,
        is_ready: false,
        created_by: userName,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create material')
      return
    }

    setMaterials((prev) => [...prev, data])
    setIsMaterialFormOpen(false)
    resetMaterialForm()
    toast.success('Material added')
  }

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return

    const { error } = await supabase
      .from('showcase_materials')
      .update({
        item: materialForm.item,
        category: materialForm.category || null,
        responsible: materialForm.responsible || null,
        notes: materialForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingMaterial.id)

    if (error) {
      toast.error('Failed to update material')
      return
    }

    await fetchMaterials()
    setEditingMaterial(null)
    setIsMaterialFormOpen(false)
    resetMaterialForm()
    toast.success('Material updated')
  }

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from('showcase_materials').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete material')
      return
    }
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    toast.success('Material deleted')
  }

  const handleToggleMaterialReady = async (material: Material) => {
    const { error } = await supabase
      .from('showcase_materials')
      .update({ is_ready: !material.is_ready, updated_at: new Date().toISOString() })
      .eq('id', material.id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setMaterials((prev) =>
      prev.map((m) => (m.id === material.id ? { ...m, is_ready: !m.is_ready } : m))
    )
  }

  const resetMaterialForm = () => {
    setMaterialForm({
      item: '',
      category: '',
      responsible: '',
      notes: '',
    })
  }

  const openEditMaterial = (material: Material) => {
    setMaterialForm({
      item: material.item,
      category: material.category || '',
      responsible: material.responsible || '',
      notes: material.notes || '',
    })
    setEditingMaterial(material)
    setIsMaterialFormOpen(true)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Format time for HTML time input (HH:MM)
  const formatTimeForInput = (time: string | null | undefined): string => {
    if (!time) return ''
    // Handle formats: "HH:MM", "HH:MM:SS", "HH:MM:SS.mmm", "HH:MM:SS+TZ"
    const match = time.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return ''
    const hours = match[1].padStart(2, '0')
    const minutes = match[2]
    return `${hours}:${minutes}`
  }

  // Format time for database (HH:MM:SS)
  const formatTimeForDB = (time: string | null | undefined): string | null => {
    if (!time) return null
    // If already has seconds, return as-is
    if (/^\d{2}:\d{2}:\d{2}/.test(time)) return time
    // Add seconds
    return `${time}:00`
  }

  // Group activities by group
  const groupedActivities = groups.reduce((acc, group) => {
    acc[group.id] = activities.filter(a => a.group_id === group.id)
    return acc
  }, {} as Record<string, DayActivity[]>)

  // Activities without a group
  const ungroupedActivities = activities.filter(a => !a.group_id)

  const readyCount = materials.filter(m => m.is_ready).length
  const totalMaterials = materials.length

  return (
    <div className="space-y-6">
      {/* Day Selector */}
      <Tabs value={selectedDate} onValueChange={setSelectedDate}>
        <TabsList className="grid w-full grid-cols-3">
          {EVENT_DAYS.map((day) => (
            <TabsTrigger key={day.date} value={day.date} className="flex flex-col">
              <span className="font-semibold">{day.label}</span>
              <span className="text-xs text-muted-foreground">{day.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activities Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Day Schedule
              </CardTitle>
              <Button size="sm" onClick={() => { resetActivityForm(); setEditingActivity(null); setIsActivityFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : (
              <div className="space-y-6">
                {/* Ungrouped activities (General) */}
                {ungroupedActivities.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-muted-foreground">
                      <span className="h-3 w-3 rounded-full bg-gray-500" />
                      General Schedule
                    </h4>
                    <ActivityTable
                      activities={ungroupedActivities}
                      onEdit={openEditActivity}
                      onDelete={handleDeleteActivity}
                      formatTime={formatTime}
                    />
                  </div>
                )}

                {/* Grouped activities */}
                {groups.map((group) => {
                  const groupActs = groupedActivities[group.id] || []
                  if (groupActs.length === 0) return null

                  return (
                    <div key={group.id}>
                      <h4 className="mb-2 flex items-center gap-2 font-semibold">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </h4>
                      <ActivityTable
                        activities={groupActs}
                        onEdit={openEditActivity}
                        onDelete={handleDeleteActivity}
                        formatTime={formatTime}
                      />
                    </div>
                  )
                })}

                {activities.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No activities scheduled for this day</p>
                    <p className="text-sm">Click "Add Activity" to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Match Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Match Schedule
              </CardTitle>
              <Button size="sm" onClick={() => { resetMatchForm(); setEditingMatch(null); setIsMatchFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Match
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No matches scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {match.match_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {match.team_a} <span className="text-muted-foreground">vs</span> {match.team_b}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatTime(match.start_time)}</span>
                        {match.field && <span>• {match.field}</span>}
                        {match.referee && <span>• Ref: {match.referee}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditMatch(match)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMatch(match.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Checklist */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Checklist
                <Badge variant={readyCount === totalMaterials && totalMaterials > 0 ? 'default' : 'secondary'}>
                  {readyCount}/{totalMaterials} Ready
                </Badge>
              </CardTitle>
              <Button size="sm" onClick={() => { resetMaterialForm(); setEditingMaterial(null); setIsMaterialFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No materials in checklist</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      material.is_ready ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={material.is_ready}
                      onCheckedChange={() => handleToggleMaterialReady(material)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium", material.is_ready && "line-through opacity-70")}>
                        {material.item}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {material.category && <Badge variant="outline" className="text-xs">{material.category}</Badge>}
                        {material.responsible && <span>• {material.responsible}</span>}
                      </div>
                      {material.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{material.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditMaterial(material)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(material.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Form Dialog */}
      <Dialog key={editingActivity?.id || 'new'} open={isActivityFormOpen} onOpenChange={setIsActivityFormOpen}>
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
                  <SelectValue placeholder="Select a group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group (General)</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                        {group.name}
                      </div>
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
              <Label>Responsible</Label>
              <Input
                value={activityForm.responsible}
                onChange={(e) => setActivityForm(prev => ({ ...prev, responsible: e.target.value }))}
                placeholder="Who's in charge?"
              />
            </div>

            <div>
              <Label>Todos</Label>
              <Textarea
                value={activityForm.todos}
                onChange={(e) => setActivityForm(prev => ({ ...prev, todos: e.target.value }))}
                placeholder="Tasks to complete for this activity..."
                rows={2}
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
                <Button variant="outline" onClick={() => setIsActivityFormOpen(false)}>
                  Cancel
                </Button>
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
                <Label>Match # *</Label>
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
                  placeholder="Field 1, Main Pitch, etc."
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
                <Button variant="outline" onClick={() => setIsMatchFormOpen(false)}>
                  Cancel
                </Button>
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

      {/* Material Form Dialog */}
      <Dialog key={editingMaterial?.id || 'new-material'} open={isMaterialFormOpen} onOpenChange={setIsMaterialFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add Material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item *</Label>
              <Input
                value={materialForm.item}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, item: e.target.value }))}
                placeholder="What do you need?"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={materialForm.category}
                onValueChange={(v) => setMaterialForm(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Responsible</Label>
              <Input
                value={materialForm.responsible}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, responsible: e.target.value }))}
                placeholder="Who's responsible?"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={materialForm.notes}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-2">
              {editingMaterial ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteMaterial(editingMaterial.id)
                    setIsMaterialFormOpen(false)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsMaterialFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
                  disabled={!materialForm.item}
                >
                  {editingMaterial ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Activity Table Component
function ActivityTable({
  activities,
  onEdit,
  onDelete,
  formatTime
}: {
  activities: DayActivity[]
  onEdit: (activity: DayActivity) => void
  onDelete: (id: string) => void
  formatTime: (time: string) => string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-3 py-2 text-left font-medium">Activity</th>
            <th className="px-3 py-2 text-left font-medium">Responsible</th>
            <th className="px-3 py-2 text-left font-medium">Todos</th>
            <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id} className="border-b hover:bg-muted/30">
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="font-medium">{formatTime(activity.start_time)}</span>
                {activity.end_time && (
                  <span className="text-muted-foreground"> - {formatTime(activity.end_time)}</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div>{activity.activity}</div>
                {activity.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.notes}</p>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {activity.responsible || '-'}
              </td>
              <td className="px-3 py-2">
                {activity.todos ? (
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{activity.todos}</div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(activity)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(activity.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
