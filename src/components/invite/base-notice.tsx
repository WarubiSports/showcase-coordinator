import { User } from 'lucide-react'
import type { InvitePayload } from '@/components/invite/invite-types'

// Shown above the form when the invite is linked to the player's Athletes USA profile in Base
export const BaseNotice = ({ base }: { base: NonNullable<InvitePayload['base']> }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
    {base.photo_url ? (
      // Base photos live on external hosts; next/image would need every host allow-listed
      // eslint-disable-next-line @next/next/no-img-element
      <img src={base.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
    ) : (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-400">
        <User className="h-7 w-7" />
      </div>
    )}
    <div className="text-sm">
      <p className="font-semibold text-gray-950">{base.name ?? 'Dein Athletes USA Profil'}</p>
      <p className="text-gray-700">Deine Angaben aus deinem Athletes USA Profil, bitte prüfen.</p>
    </div>
  </div>
)
