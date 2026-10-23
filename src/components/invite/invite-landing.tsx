'use client'

import { useState } from 'react'
import { Calendar, Clock, ExternalLink, MapPin, Video } from 'lucide-react'
import { germanTime, weekdayDate } from '@/lib/german-date'
import type { InvitePayload } from '@/components/invite/invite-types'
import { PlayerCard, hasPlayerCard } from '@/components/invite/player-card'

interface InviteLandingProps {
  data: InvitePayload
  onAccept: () => void
  onDecline: () => Promise<void>
}

export const EventFacts = ({ event }: { event: InvitePayload['event'] }) => {
  const time = [germanTime(event.start_time), event.end_time ? `bis ${germanTime(event.end_time)}` : null].filter(Boolean).join(' ')
  return (
    <div className="rounded-xl border border-ausa-ink-200 bg-ausa-paper p-4 space-y-2">
      <p className="font-ausa-display font-semibold text-ausa-ink-900">{event.name}</p>
      <p className="flex items-center gap-2 text-sm text-ausa-ink-700"><Calendar className="h-4 w-4 shrink-0 text-ausa-ink-400" />{weekdayDate(event.start_date)}</p>
      {time && <p className="flex items-center gap-2 text-sm text-ausa-ink-700"><Clock className="h-4 w-4 shrink-0 text-ausa-ink-400" />{time}</p>}
      <p className="flex items-center gap-2 text-sm text-ausa-ink-700"><MapPin className="h-4 w-4 shrink-0 text-ausa-ink-400" />{event.location}</p>
      {event.description && <p className="pt-1 text-sm text-ausa-ink-500">{event.description}</p>}
    </div>
  )
}

export const InviteLanding = ({ data, onAccept, onDecline }: InviteLandingProps) => {
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [declining, setDeclining] = useState(false)
  const profileUrl = data.player?.profile_url ?? data.invite.profile_url

  const decline = async () => {
    setDeclining(true)
    try {
      await onDecline()
    } finally {
      setDeclining(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-ausa-display text-3xl font-semibold text-ausa-ink-900">Hi {data.invite.first_name},</h1>
        <p className="mt-1 text-ausa-ink-500">{data.invite.invited_by} hat dich eingeladen.</p>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ausa-ink-900 underline">
            <ExternalLink className="h-4 w-4" />
            Dein Profil
          </a>
        )}
      </div>

      {hasPlayerCard(data.invite) && <PlayerCard invite={data.invite} />}

      <EventFacts event={data.event} />

      <div className="flex gap-3 rounded-xl bg-ausa-ink-100 p-4 text-sm text-ausa-ink-700">
        <Video className="mt-0.5 h-5 w-5 shrink-0 text-ausa-ink-400" />
        <p>Das komplette Spiel wird mit Veo aufgenommen. Danach bekommst du deine eigenen Szenen für dein Spielerprofil.</p>
      </div>

      {confirmDecline ? (
        <div className="space-y-3 rounded-xl border border-ausa-ink-200 bg-ausa-paper p-4">
          <p className="font-medium text-ausa-ink-900">Wirklich absagen?</p>
          <div className="flex gap-3">
            <button onClick={decline} disabled={declining} className="flex-1 rounded-xl bg-ausa-ink-900 py-3 font-semibold text-white disabled:opacity-50">
              {declining ? 'Einen Moment...' : 'Ja, absagen'}
            </button>
            <button onClick={() => setConfirmDecline(false)} className="flex-1 rounded-xl border border-ausa-ink-300 py-3 font-semibold text-ausa-ink-700">
              Zurück
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={onAccept} className="w-full rounded-xl bg-ausa-accent py-4 font-ausa-display text-lg font-semibold text-white hover:bg-ausa-accent-hover active:scale-[0.98]">
            Ich bin dabei
          </button>
          <button onClick={() => setConfirmDecline(true)} className="w-full rounded-xl border border-ausa-ink-300 bg-ausa-paper py-4 text-lg font-semibold text-ausa-ink-700">
            Ich kann nicht
          </button>
          <p className="text-center text-xs text-ausa-ink-400">Zusage dauert zwei Minuten: ein paar Angaben und dein Einverständnis.</p>
        </div>
      )}
    </div>
  )
}
