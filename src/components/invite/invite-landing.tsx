'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Video } from 'lucide-react'
import { germanTime, weekdayDate } from '@/lib/german-date'
import type { InvitePayload } from '@/components/invite/invite-types'

interface InviteLandingProps {
  data: InvitePayload
  onAccept: () => void
  onDecline: () => Promise<void>
}

export const EventFacts = ({ event }: { event: InvitePayload['event'] }) => {
  const time = [germanTime(event.start_time), event.end_time ? `bis ${germanTime(event.end_time)}` : null].filter(Boolean).join(' ')
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <p className="font-bold text-gray-950">{event.name}</p>
      <p className="flex items-center gap-2 text-sm text-gray-700"><Calendar className="h-4 w-4 shrink-0 text-gray-400" />{weekdayDate(event.start_date)}</p>
      {time && <p className="flex items-center gap-2 text-sm text-gray-700"><Clock className="h-4 w-4 shrink-0 text-gray-400" />{time}</p>}
      <p className="flex items-center gap-2 text-sm text-gray-700"><MapPin className="h-4 w-4 shrink-0 text-gray-400" />{event.location}</p>
      {event.description && <p className="pt-1 text-sm text-gray-600">{event.description}</p>}
    </div>
  )
}

export const InviteLanding = ({ data, onAccept, onDecline }: InviteLandingProps) => {
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [declining, setDeclining] = useState(false)

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
        <h1 className="text-3xl font-bold text-gray-950">Hi {data.invite.first_name},</h1>
        <p className="mt-1 text-gray-600">{data.invite.invited_by} hat dich eingeladen.</p>
      </div>

      <EventFacts event={data.event} />

      <div className="flex gap-3 rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
        <Video className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
        <p>Das komplette Spiel wird mit Veo aufgenommen. Danach bekommst du deine eigenen Szenen für dein Spielerprofil.</p>
      </div>

      {confirmDecline ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-950">Wirklich absagen?</p>
          <div className="flex gap-3">
            <button onClick={decline} disabled={declining} className="flex-1 rounded-xl bg-gray-950 py-3 font-semibold text-white disabled:opacity-50">
              {declining ? 'Einen Moment...' : 'Ja, absagen'}
            </button>
            <button onClick={() => setConfirmDecline(false)} className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700">
              Zurück
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={onAccept} className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white active:scale-[0.98]">
            Ich bin dabei
          </button>
          <button onClick={() => setConfirmDecline(true)} className="w-full rounded-xl border border-gray-300 bg-white py-4 text-lg font-semibold text-gray-700">
            Ich kann nicht
          </button>
          <p className="text-center text-xs text-gray-500">Zusage dauert zwei Minuten: ein paar Angaben und dein Einverständnis.</p>
        </div>
      )}
    </div>
  )
}
