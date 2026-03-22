'use client'

import { useState, useEffect } from 'react'
import { Settings, Globe, Users, Plus, Trash2, GripVertical, Loader2, ExternalLink, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AppShell } from '@/components/app-shell'
import { useEvent } from '@/contexts/event-context'
import { useEvents } from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import type { EventScout } from '@/types'
import { toast } from 'sonner'

const ACCENT_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
]

export default function SettingsPage() {
  const { currentEvent, refetchEvents } = useEvent()
  const { updateEvent } = useEvents()

  // Event details
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  // Registration settings
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('')
  const [registrationDeadline, setRegistrationDeadline] = useState('')
  const [accentColor, setAccentColor] = useState('#3B82F6')
  const [registrationDetails, setRegistrationDetails] = useState('')
  const [isSavingReg, setIsSavingReg] = useState(false)

  // Scouts
  const [scouts, setScouts] = useState<EventScout[]>([])
  const [isLoadingScouts, setIsLoadingScouts] = useState(true)
  const [showScoutDialog, setShowScoutDialog] = useState(false)
  const [editingScout, setEditingScout] = useState<EventScout | null>(null)
  const [scoutForm, setScoutForm] = useState({ name: '', organization: '', logo_url: '' })

  useEffect(() => {
    if (!currentEvent) return
    // Populate event details
    setName(currentEvent.name)
    setLocation(currentEvent.location)
    setStartDate(currentEvent.start_date)
    setEndDate(currentEvent.end_date)
    setStartTime(currentEvent.start_time?.slice(0, 5) || '')
    setEndTime(currentEvent.end_time?.slice(0, 5) || '')
    setDescription(currentEvent.description || '')
    // Populate registration settings
    setRegistrationOpen(currentEvent.registration_open || false)
    setPrice(currentEvent.price?.toString() || '')
    setCurrency(currentEvent.currency || 'USD')
    setAgeMin(currentEvent.age_min?.toString() || '')
    setAgeMax(currentEvent.age_max?.toString() || '')
    setMaxPlayers(currentEvent.max_players?.toString() || '')
    setRegistrationDeadline(currentEvent.registration_deadline?.slice(0, 10) || '')
    setAccentColor(currentEvent.accent_color || '#3B82F6')
    setRegistrationDetails(currentEvent.registration_details || '')
    // Load scouts
    loadScouts()
  }, [currentEvent?.id])

  const loadScouts = async () => {
    if (!currentEvent) return
    setIsLoadingScouts(true)
    const { data } = await supabase
      .from('showcase_event_scouts')
      .select('*')
      .eq('event_id', currentEvent.id)
      .order('sort_order')
    setScouts(data || [])
    setIsLoadingScouts(false)
  }

  const handleSaveDetails = async () => {
    if (!currentEvent) return
    setIsSavingDetails(true)
    try {
      const { error } = await supabase
        .from('showcase_events')
        .update({
          name: name.trim(),
          location: location.trim(),
          start_date: startDate,
          end_date: endDate,
          start_time: startTime ? startTime + ':00' : null,
          end_time: endTime ? endTime + ':00' : null,
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentEvent.id)
      if (error) throw error
      await refetchEvents()
      toast.success('Event details saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleSaveRegistration = async () => {
    if (!currentEvent) return
    setIsSavingReg(true)
    try {
      const { error } = await supabase
        .from('showcase_events')
        .update({
          registration_open: registrationOpen,
          price: price ? parseFloat(price) : null,
          currency,
          age_min: ageMin ? parseInt(ageMin) : null,
          age_max: ageMax ? parseInt(ageMax) : null,
          max_players: maxPlayers ? parseInt(maxPlayers) : null,
          registration_deadline: registrationDeadline ? registrationDeadline + 'T23:59:59Z' : null,
          accent_color: accentColor,
          registration_details: registrationDetails.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentEvent.id)

      if (error) throw error
      await refetchEvents()
      toast.success('Registration settings saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSavingReg(false)
    }
  }

  const handleSaveScout = async () => {
    if (!currentEvent || !scoutForm.name.trim()) return
    try {
      if (editingScout) {
        const { error } = await supabase
          .from('showcase_event_scouts')
          .update({
            name: scoutForm.name.trim(),
            organization: scoutForm.organization.trim() || null,
            logo_url: scoutForm.logo_url.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingScout.id)
        if (error) throw error
        toast.success('Scout updated')
      } else {
        const { error } = await supabase
          .from('showcase_event_scouts')
          .insert([{
            event_id: currentEvent.id,
            name: scoutForm.name.trim(),
            organization: scoutForm.organization.trim() || null,
            logo_url: scoutForm.logo_url.trim() || null,
            sort_order: scouts.length,
          }])
        if (error) throw error
        toast.success('Scout added')
      }
      setShowScoutDialog(false)
      setEditingScout(null)
      setScoutForm({ name: '', organization: '', logo_url: '' })
      loadScouts()
    } catch {
      toast.error('Failed to save scout')
    }
  }

  const handleDeleteScout = async (id: string) => {
    const { error } = await supabase.from('showcase_event_scouts').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    setScouts(scouts.filter(s => s.id !== id))
    toast.success('Scout removed')
  }

  const registrationUrl = currentEvent
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${currentEvent.slug}`
    : ''

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No event selected</p>
      </div>
    )
  }

  return (
    <AppShell>
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Event Settings</h1>
      </div>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Event Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <Button onClick={handleSaveDetails} disabled={isSavingDetails}>
            {isSavingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Details
          </Button>
        </CardContent>
      </Card>

      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Registration
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="reg-toggle" className="text-sm">Open</Label>
              <Switch
                id="reg-toggle"
                checked={registrationOpen}
                onCheckedChange={setRegistrationOpen}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Registration URL */}
          {registrationUrl && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <code className="text-sm flex-1 truncate">{registrationUrl}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { navigator.clipboard.writeText(registrationUrl); toast.success('Copied!') }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={registrationUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Price</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="175"
                  className="flex-1"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-md border bg-transparent px-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Max Players</Label>
              <Input
                type="number"
                min={1}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                placeholder="No limit"
              />
            </div>
            <div>
              <Label>Age Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  placeholder="Min"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <Label>Registration Deadline</Label>
              <Input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <Label>Accent Color</Label>
            <div className="flex gap-2 mt-1">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${accentColor === color ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-background' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAccentColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Registration Details */}
          <div>
            <Label>Registration Page Details</Label>
            <Textarea
              value={registrationDetails}
              onChange={(e) => setRegistrationDetails(e.target.value)}
              placeholder="Additional info shown on the registration page (schedule, what to bring, etc.)"
              rows={4}
            />
          </div>

          <Button onClick={handleSaveRegistration} disabled={isSavingReg}>
            {isSavingReg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Registration Settings
          </Button>
        </CardContent>
      </Card>

      {/* Scouts / Coaches */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attending Coaches & Scouts
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingScout(null)
                setScoutForm({ name: '', organization: '', logo_url: '' })
                setShowScoutDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingScouts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No coaches or scouts added yet. Add them to show on the registration page.
            </p>
          ) : (
            <div className="space-y-2">
              {scouts.map((scout) => (
                <div
                  key={scout.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  {scout.logo_url ? (
                    <img src={scout.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                      {scout.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{scout.name}</p>
                    {scout.organization && (
                      <p className="text-xs text-muted-foreground">{scout.organization}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingScout(scout)
                      setScoutForm({
                        name: scout.name,
                        organization: scout.organization || '',
                        logo_url: scout.logo_url || '',
                      })
                      setShowScoutDialog(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDeleteScout(scout.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scout Dialog */}
      <Dialog open={showScoutDialog} onOpenChange={setShowScoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingScout ? 'Edit Scout/Coach' : 'Add Scout/Coach'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={scoutForm.name}
                onChange={(e) => setScoutForm({ ...scoutForm, name: e.target.value })}
                placeholder="Coach Name"
              />
            </div>
            <div>
              <Label>Organization / School</Label>
              <Input
                value={scoutForm.organization}
                onChange={(e) => setScoutForm({ ...scoutForm, organization: e.target.value })}
                placeholder="e.g. Fordham University"
              />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={scoutForm.logo_url}
                onChange={(e) => setScoutForm({ ...scoutForm, logo_url: e.target.value })}
                placeholder="https://..."
              />
              {scoutForm.logo_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={scoutForm.logo_url} alt="Preview" className="h-10 w-10 object-contain rounded" />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowScoutDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveScout} disabled={!scoutForm.name.trim()}>
                {editingScout ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AppShell>
  )
}
