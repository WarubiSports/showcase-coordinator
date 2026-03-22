'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent, EventScout, PlayerPosition } from '@/types'
import { MapPin, Calendar, Clock, Users, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GK', label: 'Goalkeeper' },
  { value: 'CB', label: 'Center Back' },
  { value: 'LB', label: 'Left Back' },
  { value: 'RB', label: 'Right Back' },
  { value: 'CDM', label: 'Defensive Mid' },
  { value: 'CM', label: 'Central Mid' },
  { value: 'CAM', label: 'Attacking Mid' },
  { value: 'LW', label: 'Left Wing' },
  { value: 'RW', label: 'Right Wing' },
  { value: 'ST', label: 'Striker' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function EventRegistrationPage() {
  const params = useParams()
  const slug = params.slug as string

  const [event, setEvent] = useState<ShowcaseEvent | null>(null)
  const [scouts, setScouts] = useState<EventScout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registeredCount, setRegisteredCount] = useState(0)

  // Registration form
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birth_year: '',
    position: '' as PlayerPosition | '',
    club: '',
    country: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
  })

  useEffect(() => {
    loadEvent()
  }, [slug])

  const loadEvent = async () => {
    const { data: eventData, error: eventError } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('slug', slug)
      .single()

    if (eventError || !eventData) {
      setError('Event not found')
      setIsLoading(false)
      return
    }

    setEvent(eventData as ShowcaseEvent)

    // Load scouts and player count in parallel
    const [scoutsRes, countRes] = await Promise.all([
      supabase
        .from('showcase_event_scouts')
        .select('*')
        .eq('event_id', eventData.id)
        .order('sort_order'),
      supabase
        .from('showcase_players')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventData.id),
    ])

    setScouts(scoutsRes.data || [])
    setRegisteredCount(countRes.count || 0)
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !form.name || !form.email) return

    setIsSubmitting(true)
    try {
      const { error: insertError } = await supabase
        .from('showcase_players')
        .insert([{
          event_id: event.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          birth_year: form.birth_year ? parseInt(form.birth_year) : null,
          position: form.position || null,
          club: form.club.trim() || null,
          country: form.country.trim() || null,
          parent_name: form.parent_name.trim() || null,
          parent_email: form.parent_email.trim() || null,
          parent_phone: form.parent_phone.trim() || null,
          payment_status: 'pending',
          registered_at: new Date().toISOString(),
          created_by: 'registration',
        }])

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('You are already registered for this event')
        } else {
          throw insertError
        }
        return
      }

      // Send confirmation email
      try {
        await fetch('/api/registration-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: form.name.trim(),
            playerEmail: form.email.trim(),
            parentEmail: form.parent_email.trim() || null,
            eventName: event.name,
            eventDate: event.start_date === event.end_date
              ? formatDate(event.start_date)
              : `${formatDateShort(event.start_date)} – ${formatDateShort(event.end_date)}, ${new Date(event.start_date + 'T00:00:00').getFullYear()}`,
            eventLocation: event.location,
            eventTime: event.start_time ? formatTime(event.start_time) : null,
            price: event.price,
            currency: event.currency,
          }),
        })
      } catch {
        // Email is best-effort
      }

      setIsRegistered(true)
      setRegisteredCount(prev => prev + 1)
    } catch {
      toast.error('Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-white">Event Not Found</h1>
          <p className="text-gray-400">This event doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const accentColor = event.accent_color || '#3B82F6'
  const isFull = event.max_players ? registeredCount >= event.max_players : false
  const isPastDeadline = event.registration_deadline
    ? new Date() > new Date(event.registration_deadline)
    : false
  const canRegister = event.registration_open && !isFull && !isPastDeadline
  const dateDisplay = event.start_date === event.end_date
    ? formatDate(event.start_date)
    : `${formatDateShort(event.start_date)} – ${formatDateShort(event.end_date)}, ${new Date(event.start_date + 'T00:00:00').getFullYear()}`

  // Success state
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">You&apos;re Registered!</h1>
          <p className="text-gray-400">
            We&apos;ve sent a confirmation to <span className="text-white">{form.email}</span>.
            {event.price ? ` Payment of ${event.currency === 'EUR' ? '€' : '$'}${event.price} is due before the event.` : ''}
          </p>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-left space-y-2">
            <p className="font-semibold text-white">{event.name}</p>
            <p className="text-sm text-gray-400">{dateDisplay}</p>
            {event.start_time && (
              <p className="text-sm text-gray-400">
                {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
              </p>
            )}
            <p className="text-sm text-gray-400">{event.location}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div
        className="relative py-16 px-4"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22 0%, transparent 60%)`,
        }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
          >
            {event.type === 'id_camp' ? 'ID Camp' : event.type === 'futures' ? 'Futures' : 'Showcase'}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{event.name}</h1>

          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: accentColor }} />
              <span>{dateDisplay}</span>
            </div>
            {event.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: accentColor }} />
                <span>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: accentColor }} />
              <span>{event.location}</span>
            </div>
          </div>

          {event.price && (
            <p className="text-2xl font-bold" style={{ color: accentColor }}>
              {event.currency === 'EUR' ? '€' : '$'}{event.price}
              <span className="text-sm font-normal text-gray-400 ml-2">per player</span>
            </p>
          )}

          {event.age_min && event.age_max && (
            <p className="text-gray-400">
              Open to ages {event.age_min}–{event.age_max}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {event.registration_details && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="prose prose-invert prose-sm max-w-none">
            {event.registration_details.split('\n').map((line, i) => (
              <p key={i} className="text-gray-300">{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Scouts / Coaches */}
      {scouts.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-center mb-6">Coaches & Scouts Attending</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {scouts.map((scout) => (
              <div
                key={scout.id}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center space-y-2"
              >
                {scout.logo_url ? (
                  <img
                    src={scout.logo_url}
                    alt={scout.organization || scout.name}
                    className="h-12 w-12 object-contain mx-auto"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                  >
                    {scout.name.charAt(0)}
                  </div>
                )}
                <p className="font-medium text-sm text-white">{scout.name}</p>
                {scout.organization && (
                  <p className="text-xs text-gray-400">{scout.organization}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Section */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        {!canRegister ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
            <p className="text-gray-400">
              {!event.registration_open
                ? 'Registration is not yet open for this event.'
                : isFull
                  ? 'This event is full.'
                  : 'Registration deadline has passed.'}
            </p>
          </div>
        ) : !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-xl text-lg font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: accentColor }}
          >
            Register Now
            {event.max_players && (
              <span className="ml-2 text-sm font-normal opacity-80">
                ({event.max_players - registeredCount} spots left)
              </span>
            )}
          </button>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-bold mb-6">Player Registration</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Player Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    style={{ focusRingColor: accentColor } as React.CSSProperties}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    placeholder="player@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Birth Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2015}
                    value={form.birth_year}
                    onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    placeholder="2008"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value as PlayerPosition })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2"
                  >
                    <option value="">Select position</option>
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Club / Team</label>
                  <input
                    type="text"
                    value={form.club}
                    onChange={(e) => setForm({ ...form, club: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    placeholder="FC Example"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    placeholder="USA"
                  />
                </div>
              </div>

              {/* Parent / Guardian */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('parent-section')
                    if (el) el.classList.toggle('hidden')
                  }}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Parent / Guardian Info (optional)
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div id="parent-section" className="hidden mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Parent Name</label>
                    <input
                      type="text"
                      value={form.parent_name}
                      onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Parent Email</label>
                    <input
                      type="email"
                      value={form.parent_email}
                      onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Parent Phone</label>
                    <input
                      type="tel"
                      value={form.parent_phone}
                      onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !form.name || !form.email}
                className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </span>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Spots counter */}
        {event.max_players && canRegister && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {registeredCount} / {event.max_players} registered
          </p>
        )}
      </div>
    </div>
  )
}
