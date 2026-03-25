'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface VenueLeafletMapProps {
  lat: number
  lng: number
  zoom: number
  onMove?: (lat: number, lng: number) => void
  interactive?: boolean
}

export function VenueLeafletMap({ lat, lng, zoom, onMove, interactive = true }: VenueLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      attributionControl: false,
    })

    // Satellite-style tiles from ESRI
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 }
    ).addTo(map)

    // Add a subtle label layer on top
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, opacity: 0.6 }
    ).addTo(map)

    const marker = L.marker([lat, lng]).addTo(map)
    markerRef.current = marker
    mapRef.current = map

    if (interactive && onMove) {
      map.on('moveend', () => {
        const center = map.getCenter()
        marker.setLatLng(center)
        onMove(center.lat, center.lng)
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update center when lat/lng props change (for zoom slider, etc.)
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const currentCenter = map.getCenter()
    // Only update if significantly different (avoids loop with onMove)
    if (Math.abs(currentCenter.lat - lat) > 0.00001 || Math.abs(currentCenter.lng - lng) > 0.00001) {
      map.setView([lat, lng], zoom, { animate: true })
      markerRef.current?.setLatLng([lat, lng])
    }
  }, [lat, lng])

  // Update zoom when prop changes
  useEffect(() => {
    if (!mapRef.current) return
    if (mapRef.current.getZoom() !== zoom) {
      mapRef.current.setZoom(zoom)
    }
  }, [zoom])

  return <div ref={containerRef} className="w-full h-full" />
}
