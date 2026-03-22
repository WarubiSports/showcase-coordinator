'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent, EventScout, PlayerPosition } from '@/types'
import { MapPin, Calendar, Clock, Users, ChevronDown, ChevronUp, Check, Loader2, AlertCircle } from 'lucide-react'
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
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  const h = parseInt(parts[0] || '0', 10)
  const m = parts[1] || '00'
  if (isNaN(h)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

// Reusable input style generator with dynamic focus ring
function inputStyle(accentColor: string): React.CSSProperties {
  return {
    '--ring-color': accentColor,
  } as React.CSSProperties
}

const INPUT_CLASS =
  'w-full rounded-lg bg-gray-800/80 border border-gray-700 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors'

export default function EventRegistrationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const referredByScoutId = searchParams.get('ref') || null

  const [event, setEvent] = useState<ShowcaseEvent | null>(null)
  const [scouts, setScouts] = useState<EventScout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [referrerName, setReferrerName] = useState<string | null>(null)

  // Registration form
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [parentExpanded, setParentExpanded] = useState(false)
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

  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEvent()
  }, [slug])

  // Set document title when event loads
  useEffect(() => {
    if (event) {
      document.title = `${event.name} | Registration`
    }
    return () => {
      document.title = 'Showcase Coordinator'
    }
  }, [event])

  // Auto-expand parent section for minors
  useEffect(() => {
    if (event && event.age_max && event.age_max <= 17) {
      setParentExpanded(true)
    }
  }, [event])

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

    // Look up referring scout name
    if (referredByScoutId) {
      const { data: scoutData } = await supabase
        .from('scouts')
        .select('name')
        .eq('id', referredByScoutId)
        .single()
      if (scoutData?.name) setReferrerName(scoutData.name)
    }

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
          referred_by_scout_id: referredByScoutId,
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
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Event Not Found</h1>
          <p className="text-gray-400 max-w-sm">This event doesn&apos;t exist or has been removed. Check the URL and try again.</p>
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
  const spotsRemaining = event.max_players ? event.max_players - registeredCount : null
  const spotsFraction = event.max_players ? registeredCount / event.max_players : 0

  // Success state
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center animate-[scale-in_0.3s_ease-out]"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">You&apos;re Registered!</h1>
            <p className="text-gray-400 text-base sm:text-lg">
              We&apos;ve sent a confirmation to <span className="text-white font-medium">{form.email}</span>.
              {event.price ? ` Payment of ${event.currency === 'EUR' ? '€' : '$'}${event.price} is due before the event.` : ''}
            </p>
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 text-left space-y-3">
              <p className="font-semibold text-white text-lg">{event.name}</p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                <span>{dateDisplay}</span>
              </div>
              {event.start_time && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                  <span>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Accent-color CSS custom properties for focus rings */}
      <style>{`
        .accent-focus:focus {
          --tw-ring-color: ${accentColor};
          box-shadow: 0 0 0 2px ${accentColor};
          border-color: transparent;
        }
        .accent-focus:focus-visible {
          --tw-ring-color: ${accentColor};
          box-shadow: 0 0 0 2px ${accentColor};
          border-color: transparent;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 ${accentColor}40; }
          50% { box-shadow: 0 0 0 8px ${accentColor}00; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.4s ease-out;
        }
        .btn-pulse {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Hero */}
      <div
        className="relative py-12 sm:py-20 px-4 overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${accentColor}20 0%, ${accentColor}08 40%, transparent 70%)`,
        }}
      >
        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center space-y-5 sm:space-y-6">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}33` }}
          >
            {event.type === 'id_camp' ? 'ID Camp' : event.type === 'futures' ? 'Futures' : 'Showcase'}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight px-2">{event.name}</h1>
          {referrerName && (
            <p className="text-sm text-gray-400">
              Recommended by <span className="font-semibold text-white">{referrerName}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-5 text-gray-300 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
              <span>{dateDisplay}</span>
            </div>
            {event.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                <span>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
              <span>{event.location}</span>
            </div>
          </div>

          {event.price && (
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: accentColor }}>
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

      <div className="flex-1">
        {/* Description */}
        {event.registration_details && (
          <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
            <div className="prose prose-invert prose-sm max-w-none">
              {event.registration_details.split('\n').map((line, i) => (
                <p key={i} className="text-gray-300 leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Scouts / Coaches */}
        {scouts.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
            <h2 className="text-xl font-bold text-center mb-6">Coaches & Scouts Attending</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {scouts.map((scout) => (
                <div
                  key={scout.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-center space-y-2 hover:border-gray-700 transition-colors"
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
                      style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
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

        {/* Spots remaining progress bar */}
        {event.max_players && (
          <div className="max-w-2xl mx-auto px-4 pb-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {isFull ? 'Event is full' : `${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} remaining`}
                </span>
                <span className="text-gray-500">
                  {registeredCount} / {event.max_players} registered
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(spotsFraction * 100, 100)}%`,
                    backgroundColor: spotsFraction >= 0.9 ? '#EF4444' : accentColor,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Registration Section */}
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-12 sm:pb-16">
          {!canRegister ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-8 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {!event.registration_open
                  ? 'Registration Not Yet Open'
                  : isFull
                    ? 'Event Full'
                    : 'Registration Closed'}
              </h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                {!event.registration_open
                  ? 'Registration for this event has not opened yet. Check back later.'
                  : isFull
                    ? 'All spots for this event have been filled. Contact the organizer for waitlist options.'
                    : 'The registration deadline for this event has passed.'}
              </p>
              {/* Still show event info */}
              <div className="pt-4 border-t border-gray-800">
                <div className="text-sm text-gray-500 space-y-1">
                  <p>{dateDisplay}</p>
                  {event.start_time && <p>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</p>}
                  <p>{event.location}</p>
                </div>
              </div>
            </div>
          ) : !showForm ? (
            <button
              onClick={() => {
                setShowForm(true)
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
              }}
              className="btn-pulse w-full py-4 sm:py-5 rounded-xl text-lg font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: accentColor }}
            >
              Register Now
              {spotsRemaining !== null && spotsRemaining <= 20 && (
                <span className="ml-2 text-sm font-normal opacity-80">
                  ({spotsRemaining} spot{spotsRemaining === 1 ? '' : 's'} left)
                </span>
              )}
            </button>
          ) : (
            <div ref={formRef} className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 sm:p-6 animate-fade-up">
              <h2 className="text-xl font-bold mb-6">Player Registration</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Player Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="player@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Birth Year</label>
                    <input
                      type="number"
                      min={2000}
                      max={2015}
                      value={form.birth_year}
                      onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="2008"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Position</label>
                    <select
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value as PlayerPosition })}
                      className={`${INPUT_CLASS} accent-focus`}
                    >
                      <option value="">Select position</option>
                      {POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Club / Team</label>
                    <input
                      type="text"
                      value={form.club}
                      onChange={(e) => setForm({ ...form, club: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="FC Example"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Country</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className={`${INPUT_CLASS} accent-focus`}
                      placeholder="USA"
                    />
                  </div>
                </div>

                {/* Parent / Guardian */}
                <div className="pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setParentExpanded(!parentExpanded)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    Parent / Guardian Info {event.age_max && event.age_max <= 17 ? '(recommended)' : '(optional)'}
                    {parentExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {parentExpanded && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Parent Name</label>
                        <input
                          type="text"
                          value={form.parent_name}
                          onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                          className={`${INPUT_CLASS} accent-focus`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Parent Email</label>
                        <input
                          type="email"
                          value={form.parent_email}
                          onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                          className={`${INPUT_CLASS} accent-focus`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Parent Phone</label>
                        <input
                          type="tel"
                          value={form.parent_phone}
                          onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                          className={`${INPUT_CLASS} accent-focus`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !form.name || !form.email}
                  className="w-full py-3.5 sm:py-3 rounded-xl text-white font-semibold text-base transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:hover:brightness-100"
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
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="py-6 text-center">
      <p className="text-xs text-gray-600">
        Powered by{' '}
        <a
          href="https://warubi-sports.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-400 transition-colors"
        >
          Warubi Sports
        </a>
      </p>
    </footer>
  )
}
