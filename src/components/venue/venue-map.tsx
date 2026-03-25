'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Edit2, Trash2, Move, MapPin, Save, X, Upload, GripVertical, RotateCw, Search, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/contexts/event-context'
import type { VenueZone, VenueZoneType } from '@/types'


// Lazy-loaded Leaflet map (avoids SSR issues with Next.js)
const VenueLeafletMap = dynamic(() => import('./venue-leaflet-map').then(m => ({ default: m.VenueLeafletMap })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>,
})

const ZONE_TYPES: { value: VenueZoneType; label: string; color: string }[] = [
  { value: 'field', label: 'Playing Field', color: '#22C55E' },
  { value: 'registration', label: 'Registration', color: '#3B82F6' },
  { value: 'catering', label: 'Catering', color: '#F59E0B' },
  { value: 'medical', label: 'Medical', color: '#EF4444' },
  { value: 'parking', label: 'Parking', color: '#6B7280' },
  { value: 'other', label: 'Other', color: '#8B5CF6' },
]

const ZONE_COLORS = [
  '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'
]

interface VenueMapProps {
  userName: string
}

export function VenueMap({ userName }: VenueMapProps) {
  const { currentEvent, refetchEvents } = useEvent()
  const [zones, setZones] = useState<VenueZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedZone, setSelectedZone] = useState<VenueZone | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)

  // Dragging state for moving zones
  const [draggingZone, setDraggingZone] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)

  // Rotating state
  const [rotatingZone, setRotatingZone] = useState<string | null>(null)

  // Venue location state
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [venueAddress, setVenueAddress] = useState('')
  const [venueZoom, setVenueZoom] = useState(currentEvent?.venue_zoom || 18)
  const [venueLat, setVenueLat] = useState<number | null>(null)
  const [venueLng, setVenueLng] = useState<number | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: ZONE_COLORS[0],
    zone_type: 'other' as VenueZoneType,
    rotation: 0,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  })

  useEffect(() => {
    fetchZones()
  }, [currentEvent?.id])

  const fetchZones = async () => {
    if (!currentEvent) return
    const { data, error } = await supabase
      .from('showcase_venue_zones')
      .select('*')
      .eq('event_id', currentEvent.id)
      .order('sort_order')

    if (error) {
      console.error('Failed to load zones:', error)
      setIsLoading(false)
      return
    }

    setZones(data || [])
    setIsLoading(false)
  }

  const getRelativeCoords = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawing) {
      e.preventDefault()
      const coords = getRelativeCoords(e)
      setDrawStart(coords)
      setDrawCurrent(coords)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && drawStart) {
      const coords = getRelativeCoords(e)
      setDrawCurrent(coords)
    } else if (draggingZone && dragOffset) {
      const coords = getRelativeCoords(e)
      const zone = zones.find(z => z.id === draggingZone)
      if (zone) {
        const newX = Math.max(0, Math.min(100 - zone.width, coords.x - dragOffset.x))
        const newY = Math.max(0, Math.min(100 - zone.height, coords.y - dragOffset.y))
        setZones(zones.map(z => z.id === draggingZone ? { ...z, x: newX, y: newY } : z))
      }
    } else if (rotatingZone) {
      const coords = getRelativeCoords(e)
      const zone = zones.find(z => z.id === rotatingZone)
      if (zone) {
        // Calculate angle from zone center to mouse position
        const centerX = zone.x + zone.width / 2
        const centerY = zone.y + zone.height / 2
        const angle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI)
        // Offset by 90 degrees so "up" is 0
        const rotation = Math.round(angle + 90)
        setZones(zones.map(z => z.id === rotatingZone ? { ...z, rotation } : z))
      }
    }
  }

  const handleMouseUp = async () => {
    if (isDrawing && drawStart && drawCurrent) {
      const width = Math.abs(drawCurrent.x - drawStart.x)
      const height = Math.abs(drawCurrent.y - drawStart.y)

      if (width >= 3 && height >= 3) {
        const x = Math.min(drawStart.x, drawCurrent.x)
        const y = Math.min(drawStart.y, drawCurrent.y)

        setFormData({
          name: '',
          description: '',
          color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
          zone_type: 'other',
          rotation: 0,
          x,
          y,
          width,
          height,
        })
        setSelectedZone({
          id: '',
          event_id: currentEvent?.id || '',
          name: '',
          description: null,
          color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
          x,
          y,
          width,
          height,
          rotation: 0,
          zone_type: null,
          sort_order: zones.length,
          created_by: null,
          created_at: '',
          updated_at: '',
        })
        setIsFormOpen(true)
        setIsDrawing(false)
      }
      setDrawStart(null)
      setDrawCurrent(null)
    }

    // Save zone position after drag
    if (draggingZone) {
      const zone = zones.find(z => z.id === draggingZone)
      if (zone) {
        const { error } = await supabase
          .from('showcase_venue_zones')
          .update({ x: zone.x, y: zone.y, updated_at: new Date().toISOString() })
          .eq('id', zone.id)

        if (error) {
          toast.error('Failed to save position')
          fetchZones() // Reload to get original positions
        }
      }
      setDraggingZone(null)
      setDragOffset(null)
    }

    // Save zone rotation after rotate
    if (rotatingZone) {
      const zone = zones.find(z => z.id === rotatingZone)
      if (zone) {
        const { error } = await supabase
          .from('showcase_venue_zones')
          .update({ rotation: zone.rotation, updated_at: new Date().toISOString() })
          .eq('id', zone.id)

        if (error) {
          toast.error('Failed to save rotation')
          fetchZones()
        }
      }
      setRotatingZone(null)
    }
  }

  const handleZoneDragStart = (e: React.MouseEvent, zone: VenueZone) => {
    if (!isEditMode) return
    e.stopPropagation()
    e.preventDefault()
    const coords = getRelativeCoords(e)
    setDraggingZone(zone.id)
    setDragOffset({ x: coords.x - zone.x, y: coords.y - zone.y })
  }

  const handleRotateStart = (e: React.MouseEvent, zone: VenueZone) => {
    e.stopPropagation()
    e.preventDefault()
    setRotatingZone(zone.id)
  }

  const handleCreateZone = async () => {
    if (!currentEvent) return
    const { data, error } = await supabase
      .from('showcase_venue_zones')
      .insert([{
        event_id: currentEvent.id,
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        x: formData.x,
        y: formData.y,
        width: formData.width,
        height: formData.height,
        rotation: formData.rotation,
        zone_type: formData.zone_type,
        sort_order: zones.length,
        created_by: userName,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create zone')
      return
    }

    setZones([...zones, data])
    setIsFormOpen(false)
    setSelectedZone(null)
    toast.success('Zone created')
  }

  const handleUpdateZone = async () => {
    if (!selectedZone || !selectedZone.id) return

    const { data, error } = await supabase
      .from('showcase_venue_zones')
      .update({
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        x: formData.x,
        y: formData.y,
        width: formData.width,
        height: formData.height,
        rotation: formData.rotation,
        zone_type: formData.zone_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedZone.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update zone')
      return
    }

    setZones(zones.map(z => z.id === selectedZone.id ? data : z))
    setIsFormOpen(false)
    setSelectedZone(null)
    toast.success('Zone updated')
  }

  const handleDeleteZone = async (id: string) => {
    const { error } = await supabase
      .from('showcase_venue_zones')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete zone')
      return
    }

    setZones(zones.filter(z => z.id !== id))
    setIsFormOpen(false)
    setSelectedZone(null)
    toast.success('Zone deleted')
  }

  const openEditZone = (zone: VenueZone) => {
    setFormData({
      name: zone.name,
      description: zone.description || '',
      color: zone.color,
      zone_type: zone.zone_type || 'other',
      rotation: zone.rotation || 0,
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
    })
    setSelectedZone(zone)
    setIsFormOpen(true)
  }

  const handleGeocodeAddress = async () => {
    if (!venueAddress.trim()) return
    setIsGeocoding(true)
    try {
      const addr = venueAddress.trim()
      const parts = addr.split(',').map(s => s.trim())
      // Try full address, then without venue name, then just city/state
      const attempts = [addr]
      if (parts.length > 2) attempts.push(parts.slice(1).join(', '))
      if (parts.length > 1) attempts.push(parts[parts.length - 1])

      for (const attempt of attempts) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(attempt)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'ShowcaseCoordinator/1.0' } }
        )
        const data = await res.json()
        if (data.length > 0) {
          setVenueLat(parseFloat(data[0].lat))
          setVenueLng(parseFloat(data[0].lon))
          toast.success('Found — drag the map to fine-tune position')
          return
        }
      }
      toast.error('Address not found. Try a simpler location.')
    } catch {
      toast.error('Geocoding failed')
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSaveVenueLocation = async () => {
    if (!currentEvent || !venueLat || !venueLng) return
    try {
      const { error } = await supabase
        .from('showcase_events')
        .update({ venue_lat: venueLat, venue_lng: venueLng, venue_zoom: venueZoom, updated_at: new Date().toISOString() })
        .eq('id', currentEvent.id)

      if (error) throw error

      await refetchEvents()
      setIsLocationOpen(false)
      toast.success('Venue location saved')
    } catch {
      toast.error('Failed to save venue location')
    }
  }

  // Nudge lat/lng — amount depends on zoom level
  const nudgeAmount = () => {
    // At zoom 18, ~0.0002 is roughly 20m. Scale with zoom.
    return 0.0002 * Math.pow(2, 18 - venueZoom)
  }

  const getDrawingRect = () => {
    if (!drawStart || !drawCurrent) return null
    return {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      width: Math.abs(drawCurrent.x - drawStart.x),
      height: Math.abs(drawCurrent.y - drawStart.y),
    }
  }

  const drawingRect = getDrawingRect()

  // Get the zone to preview (either selected zone with form data applied, or null)
  const getPreviewZone = (): VenueZone | null => {
    if (!isFormOpen || !selectedZone) return null
    return {
      ...selectedZone,
      name: formData.name || 'New Zone',
      color: formData.color,
      rotation: formData.rotation,
      x: formData.x,
      y: formData.y,
      width: formData.width,
      height: formData.height,
    }
  }

  const previewZone = getPreviewZone()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Venue Map
          </CardTitle>
          <div className="flex gap-2">
            {isDrawing ? (
              <Button size="sm" variant="outline" onClick={() => { setIsDrawing(false); setDrawStart(null); setDrawCurrent(null); }}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => { setVenueAddress(currentEvent?.location || ''); setVenueZoom(currentEvent?.venue_zoom || 18); setVenueLat(currentEvent?.venue_lat || null); setVenueLng(currentEvent?.venue_lng || null); setIsLocationOpen(true); }}>
                  <Search className="mr-2 h-4 w-4" />
                  Set Location
                </Button>
                <Button size="sm" variant={isEditMode ? 'default' : 'outline'} onClick={() => setIsEditMode(!isEditMode)}>
                  <Move className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Done' : 'Move'}
                </Button>
                <Button size="sm" onClick={() => setIsDrawing(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Zone
                </Button>
              </>
            )}
          </div>
        </div>
        {isDrawing && (
          <p className="text-sm text-muted-foreground mt-2">
            Click and drag on the map to draw a zone
          </p>
        )}
        {isEditMode && (
          <p className="text-sm text-muted-foreground mt-2">
            Drag zones to move them. Use the corner handle to rotate. Click to edit details.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className={cn(
            "relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden select-none",
            isDrawing && "cursor-crosshair",
            draggingZone && "cursor-grabbing",
            rotatingZone && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing) { setDrawStart(null); setDrawCurrent(null); }
            if (draggingZone || rotatingZone) { handleMouseUp(); }
          }}
        >
          {/* Venue Background — Leaflet static or fallback */}
          {currentEvent?.venue_lat && currentEvent?.venue_lng ? (
            <div className="w-full h-full pointer-events-none">
              <VenueLeafletMap
                lat={currentEvent.venue_lat}
                lng={currentEvent.venue_lng}
                zoom={currentEvent.venue_zoom || 18}
                interactive={false}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Set a venue location to load the map</p>
                <p className="text-xs mt-1">Click &quot;Set Location&quot; above</p>
              </div>
            </div>
          )}

          {/* Existing Zones */}
          {zones.map((zone) => {
            // Hide the zone being edited (we show preview instead)
            if (isFormOpen && selectedZone?.id === zone.id) return null

            return (
              <div
                key={zone.id}
                className={cn(
                  "absolute border-2 rounded transition-all cursor-pointer hover:border-white",
                  isEditMode && "cursor-grab",
                  hoveredZone === zone.id && "ring-2 ring-white",
                  draggingZone === zone.id && "cursor-grabbing opacity-80 ring-2 ring-white"
                )}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  borderColor: zone.color,
                  backgroundColor: `${zone.color}33`,
                  transform: `rotate(${zone.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                }}
                onMouseDown={(e) => handleZoneDragStart(e, zone)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!draggingZone) openEditZone(zone)
                }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Zone Label - inside zone */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ transform: `rotate(${-(zone.rotation || 0)}deg)` }}
                >
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: zone.color }}
                  >
                    {zone.name}
                  </span>
                </div>
                {/* Drag handle indicator when in edit mode */}
                {isEditMode && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <GripVertical className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                )}
                {/* Rotation handle when in edit mode */}
                {isEditMode && (
                  <div
                    className="absolute -top-3 -right-3 w-6 h-6 bg-white rounded-full border-2 border-gray-400 cursor-grab hover:border-primary hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                    style={{ transform: `rotate(${-(zone.rotation || 0)}deg)` }}
                    onMouseDown={(e) => handleRotateStart(e, zone)}
                  >
                    <RotateCw className="h-3 w-3 text-gray-600" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Preview Zone (shows live changes while editing) */}
          {previewZone && (
            <div
              className="absolute border-2 border-dashed rounded pointer-events-none ring-2 ring-white"
              style={{
                left: `${previewZone.x}%`,
                top: `${previewZone.y}%`,
                width: `${previewZone.width}%`,
                height: `${previewZone.height}%`,
                borderColor: previewZone.color,
                backgroundColor: `${previewZone.color}44`,
                transform: `rotate(${previewZone.rotation || 0}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${-(previewZone.rotation || 0)}deg)` }}
              >
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white whitespace-nowrap shadow-lg"
                  style={{ backgroundColor: previewZone.color }}
                >
                  {previewZone.name}
                </span>
              </div>
            </div>
          )}

          {/* Drawing Preview */}
          {isDrawing && drawingRect && (
            <div
              className="absolute border-2 border-dashed border-white bg-white/20 pointer-events-none"
              style={{
                left: `${drawingRect.x}%`,
                top: `${drawingRect.y}%`,
                width: `${drawingRect.width}%`,
                height: `${drawingRect.height}%`,
              }}
            />
          )}
        </div>

        {/* Zone Legend */}
        {zones.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <Badge
                key={zone.id}
                variant="outline"
                className="cursor-pointer hover:opacity-80"
                style={{ borderColor: zone.color, color: zone.color }}
                onClick={() => openEditZone(zone)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <span className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: zone.color }} />
                {zone.name}
              </Badge>
            ))}
          </div>
        )}

        {zones.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            No zones defined yet. Click "Add Zone" to mark areas on the map.
          </p>
        )}
      </CardContent>

      {/* Zone Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setSelectedZone(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedZone?.id ? 'Edit Zone' : 'New Zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Field 1, Registration Tent"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={formData.zone_type}
                onValueChange={(v) => {
                  const zoneType = ZONE_TYPES.find(t => t.value === v)
                  setFormData({
                    ...formData,
                    zone_type: v as VenueZoneType,
                    color: zoneType?.color || formData.color
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {ZONE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      formData.color === color ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What happens in this area?"
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-2">
              {selectedZone?.id ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteZone(selectedZone.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setIsFormOpen(false); setSelectedZone(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={selectedZone?.id ? handleUpdateZone : handleCreateZone}
                  disabled={!formData.name}
                >
                  {selectedZone?.id ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Venue Location Dialog */}
      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Venue Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Search address or venue name..."
                onKeyDown={(e) => e.key === 'Enter' && handleGeocodeAddress()}
                className="flex-1"
              />
              <Button onClick={handleGeocodeAddress} disabled={isGeocoding || !venueAddress.trim()} size="sm">
                {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Map Preview */}
            {venueLat && venueLng ? (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border" style={{ height: 300 }}>
                  <VenueLeafletMap
                    lat={venueLat}
                    lng={venueLng}
                    zoom={venueZoom}
                    onMove={(lat, lng) => { setVenueLat(lat); setVenueLng(lng); }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Drag the map to adjust position. Pin stays centered.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Search for an address to see the map preview
              </div>
            )}

            {/* Zoom slider */}
            <div>
              <Label>Zoom: {venueZoom}</Label>
              <input
                type="range"
                min={15}
                max={20}
                value={venueZoom}
                onChange={(e) => setVenueZoom(parseInt(e.target.value))}
                className="w-full mt-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Wide</span>
                <span>Close</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLocationOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveVenueLocation} disabled={!venueLat || !venueLng}>
                <Save className="mr-2 h-4 w-4" />
                Save Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
