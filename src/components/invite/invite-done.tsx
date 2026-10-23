'use client'

import { Check } from 'lucide-react'
import { EventFacts } from '@/components/invite/invite-landing'
import type { InvitePayload } from '@/components/invite/invite-types'

interface InviteDoneProps {
  data: InvitePayload
  variant: 'accepted' | 'declined'
  onEdit: () => void
  onDecline: () => Promise<void>
}

export const InviteDone = ({ data, variant, onEdit, onDecline }: InviteDoneProps) => {
  if (variant === 'declined') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-ausa-display text-3xl font-semibold text-ausa-ink-900">Schade, {data.invite.first_name}.</h1>
          <p className="mt-2 text-ausa-ink-700">Danke für die Rückmeldung. Vielleicht beim nächsten Mal.</p>
        </div>
        <button onClick={onEdit} className="w-full rounded-xl border border-ausa-ink-300 bg-ausa-paper py-3 font-semibold text-ausa-ink-700">
          Doch dabei? Hier zusagen
        </button>
      </div>
    )
  }

  const noClips = !data.player?.consent_profile_at
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ausa-good text-white"><Check className="h-7 w-7" /></span>
        <div>
          <h1 className="font-ausa-display text-3xl font-semibold text-ausa-ink-900">Du bist dabei!</h1>
          <p className="text-ausa-ink-500">Deine Zusage ist angekommen.</p>
        </div>
      </div>
      <EventFacts event={data.event} />
      <p className="text-sm text-ausa-ink-700">Wir melden uns vor dem Spiel mit den letzten Details. Bring Fußballschuhe, Schienbeinschoner und etwas zu trinken mit.</p>
      {noClips && (
        <p className="rounded-xl bg-ausa-ink-100 px-4 py-3 text-sm text-ausa-warn">
          Du hast das Häkchen bei Spielerprofil und College-Recruiting nicht gesetzt. Ohne das bekommst du keine Szenen. Du kannst es unter Angaben ändern noch setzen.
        </p>
      )}
      <div className="space-y-2">
        <button onClick={onEdit} className="w-full rounded-xl border border-ausa-ink-300 bg-ausa-paper py-3 font-semibold text-ausa-ink-700">Angaben ändern</button>
        <button onClick={onDecline} className="w-full py-2 text-sm font-medium text-ausa-ink-400 underline">Doch absagen</button>
      </div>
    </div>
  )
}
