'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Download, Loader2, Mail, Phone, RefreshCw } from 'lucide-react'

interface OrganizerPlayer {
  id: string
  name: string
  email: string | null
  phone: string | null
  birth_year: number | null
  position: string | null
  club: string | null
  country: string | null
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  payment_status: string | null
  registered_at: string | null
  created_at: string
}

interface OrganizerEvent {
  id: string
  slug: string
  name: string
  start_date: string
  location: string
  players: OrganizerPlayer[]
}

const CSV_FIELDS: (keyof OrganizerPlayer)[] = [
  'name', 'email', 'phone', 'birth_year', 'position', 'club', 'country',
  'parent_name', 'parent_email', 'parent_phone', 'payment_status', 'registered_at',
]

const toCsv = (players: OrganizerPlayer[]) =>
  [CSV_FIELDS.join(','), ...players.map((p) => CSV_FIELDS.map((f) => `"${String(p[f] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')

const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Private organizer view: registrations for the event (+ sibling days), paid toggle, CSV export
export default function OrganizerPage() {
  const { slug } = useParams<{ slug: string }>()
  const key = useSearchParams().get('key')
  const [events, setEvents] = useState<OrganizerEvent[]>([])
  const [payment, setPayment] = useState<{ label: string; url: string } | null>(null)
  const [activeSlug, setActiveSlug] = useState(slug)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/organizer/${slug}?key=${encodeURIComponent(key ?? '')}`, { cache: 'no-store' })
    return { ok: res.ok, body: await res.json().catch(() => ({})) }
  }, [slug, key])

  const apply = useCallback(({ ok, body }: { ok: boolean; body: { error?: string; events?: OrganizerEvent[]; payment?: { label: string; url: string } | null } }) => {
    if (!ok) setError(body.error || 'Could not load registrations')
    else {
      setEvents(body.events ?? [])
      setPayment(body.payment ?? null)
      setError(null)
    }
    setIsLoading(false)
  }, [])

  const load = () => {
    setIsLoading(true)
    fetchData().then(apply)
  }

  useEffect(() => {
    fetchData().then(apply)
  }, [fetchData, apply])

  const togglePaid = async (player: OrganizerPlayer) => {
    const next = player.payment_status === 'paid' ? 'pending' : 'paid'
    setSavingId(player.id)
    const res = await fetch(`/api/organizer/${slug}/players/${player.id}?key=${encodeURIComponent(key ?? '')}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: next }),
    })
    if (res.ok) {
      setEvents((prev) =>
        prev.map((e) => ({ ...e, players: e.players.map((p) => (p.id === player.id ? { ...p, payment_status: next } : p)) })),
      )
    }
    setSavingId(null)
  }

  const downloadCsv = (event: OrganizerEvent) => {
    const url = URL.createObjectURL(new Blob([toCsv(event.players)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.slug}-registrations.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const active = events.find((e) => e.slug === activeSlug) ?? events[0]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <meta name="robots" content="noindex, nofollow" />
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Organizer view</p>
            <h1 className="text-lg font-bold leading-tight">{active?.name.replace(/:.*$/, '') ?? 'Registrations'}</h1>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Private link. It shows players&apos; and parents&apos; contact details, so please don&apos;t forward it.
        </p>

        {error ? (
          <p className="mt-8 text-center text-gray-600">{error}</p>
        ) : isLoading && events.length === 0 ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Day summary doubles as tabs */}
            <div className={`mt-5 grid gap-2 ${events.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {events.map((e) => {
                const paid = e.players.filter((p) => p.payment_status === 'paid').length
                const isActive = e.slug === active?.slug
                return (
                  <button
                    key={e.slug}
                    onClick={() => setActiveSlug(e.slug)}
                    className={`rounded-md border px-4 py-3 text-left ${isActive ? 'border-gray-950 bg-white' : 'border-gray-200 bg-white/60 hover:bg-white'}`}
                  >
                    <p className="text-sm font-semibold">{e.name.split(':').pop()?.trim()} · {shortDate(e.start_date)}</p>
                    <p className="mt-1 text-2xl font-bold">{e.players.length}<span className="ml-1 text-sm font-medium text-gray-500">registered</span></p>
                    <p className="text-xs text-gray-500">{paid} paid · {e.players.length - paid} open</p>
                  </button>
                )
              })}
            </div>

            {active && (
              <section className="mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{active.players.length} {active.players.length === 1 ? 'player' : 'players'}</h2>
                  {active.players.length > 0 && (
                    <button onClick={() => downloadCsv(active)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-950">
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  )}
                </div>

                {active.players.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                    No registrations yet. New sign-ups show up here after a refresh.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {active.players.map((p) => {
                      const isPaid = p.payment_status === 'paid'
                      return (
                        <li key={p.id} className="rounded-md border border-gray-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold">{p.name}</p>
                              <p className="text-sm text-gray-500">
                                {[p.birth_year, p.position, p.club, p.country].filter(Boolean).join(' · ') || 'No details'}
                              </p>
                            </div>
                            <button
                              onClick={() => togglePaid(p)}
                              disabled={savingId === p.id}
                              className={`shrink-0 flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold ${isPaid ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isPaid && <Check className="h-4 w-4" />}
                              {isPaid ? 'Paid' : 'Mark paid'}
                            </button>
                          </div>
                          <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                            {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-gray-700 hover:underline"><Mail className="h-3.5 w-3.5" />{p.email}</a>}
                            {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-gray-700 hover:underline"><Phone className="h-3.5 w-3.5" />{p.phone}</a>}
                          </div>
                          {(p.parent_name || p.parent_email || p.parent_phone) && (
                            <div className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-600">
                              <span className="font-medium text-gray-800">Parent:</span>{' '}
                              {[p.parent_name, p.parent_email, p.parent_phone].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {payment && (
                  <p className="mt-6 text-xs text-gray-500">
                    Payments go to <a href={payment.url} target="_blank" rel="noopener noreferrer" className="underline">{payment.label}</a>; mark them paid here once they arrive.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
