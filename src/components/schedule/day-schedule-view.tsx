'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, Users, Package, Trophy, Shield } from 'lucide-react'
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
import type { DayGroup, DayActivity, Match, Material, Team } from '@/types'

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
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false)
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false)
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false)
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

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

  const [teamForm, setTeamForm] = useState({
    name: '',
    color: '#3b82f6',
    notes: '',
  })

  useEffect(() => {
    fetchGroups()
    fetchMaterials()
    fetchTeams()
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

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('showcase_teams')
      .select('*')
      .order('sort_order')
      .order('name')

    if (error) {
      console.error('Failed to load teams:', error)
      return
    }
    setTeams(data || [])
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

    const updateData = {
      group_id: activityForm.group_id || null,
      start_time: formatTimeForDB(activityForm.start_time),
      end_time: formatTimeForDB(activityForm.end_time),
      activity: activityForm.activity,
      responsible: activityForm.responsible || null,
      todos: activityForm.todos || null,
      notes: activityForm.notes || null,
      updated_at: new Date().toISOString(),
    }

    console.log('Updating activity ID:', editingActivity.id)
    console.log('Form state:', activityForm)
    console.log('end_time from form:', activityForm.end_time, 'type:', typeof activityForm.end_time)
    console.log('formatTimeForDB result:', formatTimeForDB(activityForm.end_time))
    console.log('Update data:', updateData)

    const { data, error } = await supabase
      .from('showcase_day_activities')
      .update(updateData)
      .eq('id', editingActivity.id)
      .select('*, showcase_day_groups(*)')
      .single()

    console.log('Supabase response - data:', data)
    console.log('Supabase response - error:', error)

    if (error) {
      console.error('Update error:', error)
      toast.error('Failed to update activity')
      return
    }

    if (!data) {
      toast.error('Activity not found')
      return
    }

    // Directly update state with returned data
    const updatedActivity = {
      ...data,
      group: data.showcase_day_groups,
    }

    console.log('Updated activity object:', updatedActivity)

    setActivities(prev => {
      const newActivities = prev.map(a => a.id === editingActivity.id ? updatedActivity : a)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
      console.log('New activities state:', newActivities.map(a => ({ id: a.id, activity: a.activity, start_time: a.start_time, end_time: a.end_time })))
      return newActivities
    })

    setEditingActivity(null)
    setIsActivityFormOpen(false)
    resetActivityForm()
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

  // Team CRUD
  const handleCreateTeam = async () => {
    const { data, error } = await supabase
      .from('showcase_teams')
      .insert([{
        name: teamForm.name,
        color: teamForm.color || null,
        notes: teamForm.notes || null,
        created_by: userName,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create team')
      return
    }

    setTeams((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setIsTeamFormOpen(false)
    resetTeamForm()
    toast.success('Team added')
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam) return

    const { data, error } = await supabase
      .from('showcase_teams')
      .update({
        name: teamForm.name,
        color: teamForm.color || null,
        notes: teamForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingTeam.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update team')
      return
    }

    setTeams((prev) =>
      prev.map((t) => (t.id === editingTeam.id ? data : t)).sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditingTeam(null)
    setIsTeamFormOpen(false)
    resetTeamForm()
    toast.success('Team updated')
  }

  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from('showcase_teams').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete team')
      return
    }
    setTeams((prev) => prev.filter((t) => t.id !== id))
    toast.success('Team deleted')
  }

  const resetTeamForm = () => {
    setTeamForm({
      name: '',
      color: '#3b82f6',
      notes: '',
    })
  }

  const openEditTeam = (team: Team) => {
    setTeamForm({
      name: team.name,
      color: team.color || '#3b82f6',
      notes: team.notes || '',
    })
    setEditingTeam(team)
    setIsTeamFormOpen(true)
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

  // Sort all activities chronologically
  const sortedActivities = [...activities].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  )

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
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No activities scheduled for this day</p>
                <p className="text-sm">Click "Add Activity" to get started</p>
              </div>
            ) : (
              <ActivityTable
                activities={sortedActivities}
                groups={groups}
                onEdit={openEditActivity}
                onDelete={handleDeleteActivity}
                formatTime={formatTime}
              />
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
              <div className="grid grid-cols-2 gap-4">
                {/* Field 1 */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Field 1</h4>
                  <div className="space-y-2">
                    {matches
                      .filter((m) => m.field?.toLowerCase().includes('1') || m.field?.toLowerCase() === 'field 1')
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          formatTime={formatTime}
                          onEdit={openEditMatch}
                          onDelete={handleDeleteMatch}
                        />
                      ))}
                    {matches.filter((m) => m.field?.toLowerCase().includes('1') || m.field?.toLowerCase() === 'field 1').length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">No matches on Field 1</p>
                    )}
                  </div>
                </div>
                {/* Field 2 */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Field 2</h4>
                  <div className="space-y-2">
                    {matches
                      .filter((m) => m.field?.toLowerCase().includes('2') || m.field?.toLowerCase() === 'field 2')
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          formatTime={formatTime}
                          onEdit={openEditMatch}
                          onDelete={handleDeleteMatch}
                        />
                      ))}
                    {matches.filter((m) => m.field?.toLowerCase().includes('2') || m.field?.toLowerCase() === 'field 2').length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">No matches on Field 2</p>
                    )}
                  </div>
                </div>
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

        {/* Teams */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Teams
                <Badge variant="secondary">{teams.length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={() => { resetTeamForm(); setEditingTeam(null); setIsTeamFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No teams added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: team.color || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{team.name}</div>
                      {team.notes && (
                        <p className="text-xs text-muted-foreground">{team.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditTeam(team)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)}>
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
                  onChange={(e) => {
                    console.log('End time onChange:', e.target.value)
                    setActivityForm(prev => ({ ...prev, end_time: e.target.value }))
                  }}
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
                {teams.length > 0 ? (
                  <Select
                    value={matchForm.team_a}
                    onValueChange={(v) => setMatchForm(prev => ({ ...prev, team_a: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color || '#6b7280' }} />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={matchForm.team_a}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, team_a: e.target.value }))}
                    placeholder="Team name"
                  />
                )}
              </div>
              <div>
                <Label>Team B *</Label>
                {teams.length > 0 ? (
                  <Select
                    value={matchForm.team_b}
                    onValueChange={(v) => setMatchForm(prev => ({ ...prev, team_b: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color || '#6b7280' }} />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={matchForm.team_b}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, team_b: e.target.value }))}
                    placeholder="Team name"
                  />
                )}
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

      {/* Team Form Dialog */}
      <Dialog key={editingTeam?.id || 'new-team'} open={isTeamFormOpen} onOpenChange={setIsTeamFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Add Team'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team Name *</Label>
              <Input
                value={teamForm.name}
                onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Team name"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={teamForm.color}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={teamForm.color}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={teamForm.notes}
                onChange={(e) => setTeamForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-2">
              {editingTeam ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteTeam(editingTeam.id)
                    setIsTeamFormOpen(false)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsTeamFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!teamForm.name}
                >
                  {editingTeam ? 'Update' : 'Create'}
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
  groups,
  onEdit,
  onDelete,
  formatTime
}: {
  activities: DayActivity[]
  groups: DayGroup[]
  onEdit: (activity: DayActivity) => void
  onDelete: (id: string) => void
  formatTime: (time: string) => string
}) {
  const getGroup = (groupId: string | null) => {
    if (!groupId) return null
    return groups.find(g => g.id === groupId)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-3 py-2 text-left font-medium">Group</th>
            <th className="px-3 py-2 text-left font-medium">Activity</th>
            <th className="px-3 py-2 text-left font-medium">Responsible</th>
            <th className="px-3 py-2 text-left font-medium">Todos</th>
            <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const group = getGroup(activity.group_id)
            return (
              <tr key={activity.id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-medium">{formatTime(activity.start_time)}</span>
                  {activity.end_time && (
                    <span className="text-muted-foreground"> - {formatTime(activity.end_time)}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {group ? (
                    <Badge
                      variant="outline"
                      className="whitespace-nowrap"
                      style={{
                        borderColor: group.color,
                        backgroundColor: `${group.color}20`,
                      }}
                    >
                      <span
                        className="mr-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">General</span>
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
// Match Card Component
function MatchCard({
  match,
  formatTime,
  onEdit,
  onDelete,
}: {
  match: Match
  formatTime: (time: string) => string
  onEdit: (match: Match) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {match.match_number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {match.team_a} <span className="text-muted-foreground">vs</span> {match.team_b}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatTime(match.start_time)}</span>
          {match.referee && <span>• Ref: {match.referee}</span>}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(match)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(match.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
