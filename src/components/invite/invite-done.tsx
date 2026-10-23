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
          <h1 className="text-3xl font-bold text-gray-950">Schade, {data.invite.first_name}.</h1>
          <p className="mt-2 text-gray-700">Danke für die Rückmeldung. Vielleicht beim nächsten Mal.</p>
        </div>
        <button onClick={onEdit} className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700">
          Doch dabei? Hier zusagen
        </button>
      </div>
    )
  }

  const noClips = !data.player?.consent_profile_at
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-7 w-7" /></span>
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Du bist dabei!</h1>
          <p className="text-gray-600">Deine Zusage ist angekommen.</p>
        </div>
      </div>
      <EventFacts event={data.event} />
      <p className="text-sm text-gray-700">Wir melden uns vor dem Spiel mit den letzten Details. Bring Fußballschuhe, Schienbeinschoner und etwas zu trinken mit.</p>
      {noClips && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Du hast das Häkchen bei Spielerprofil und College-Recruiting nicht gesetzt. Ohne das bekommst du keine Szenen. Du kannst es unter Angaben ändern noch setzen.
        </p>
      )}
      <div className="space-y-2">
        <button onClick={onEdit} className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700">Angaben ändern</button>
        <button onClick={onDecline} className="w-full py-2 text-sm font-medium text-gray-500 underline">Doch absagen</button>
      </div>
    </div>
  )
}
