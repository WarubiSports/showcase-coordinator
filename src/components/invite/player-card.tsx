import type { InvitePayload } from '@/components/invite/invite-types'

// Player card above the event facts, from the FuPa data the server read for the invite. Rendered only when
// the read succeeded and brought a photo or a club; otherwise the page shows nothing extra.
export const hasPlayerCard = (invite: InvitePayload['invite']): boolean => !!invite.enriched_at && !!(invite.photo_url || invite.club)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export const PlayerCard = ({ invite }: { invite: InvitePayload['invite'] }) => {
  const s = invite.stats
  const statsLine = s
    ? [s.season ? `Saison ${s.season}` : null, `${s.games} ${s.games === 1 ? 'Spiel' : 'Spiele'}`, `${s.goals} ${s.goals === 1 ? 'Tor' : 'Tore'}`, `${s.assists} ${s.assists === 1 ? 'Vorlage' : 'Vorlagen'}`]
        .filter(Boolean)
        .join(' · ')
    : null
  return (
    <div className="flex gap-4 rounded-2xl bg-gray-950 p-4 text-white shadow-lg">
      {invite.photo_url ? (
        // FuPa serves the photo from image.fupa.net; next/image would need that host allow-listed
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invite.photo_url} alt="" className="h-28 w-[88px] shrink-0 rounded-xl bg-gray-800 object-cover object-top" />
      ) : (
        <div className="grid h-28 w-[88px] shrink-0 place-items-center rounded-xl bg-gray-800 text-2xl font-bold text-gray-400">{initials(invite.name)}</div>
      )}
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Athletes USA Selection</p>
        <p className="truncate text-xl font-bold leading-tight">{invite.name}</p>
        <p className="mt-0.5 truncate text-sm text-gray-300">{[invite.club, invite.league].filter(Boolean).join(' · ')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {invite.position && <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium">{invite.position}</span>}
          {statsLine && <span className="text-gray-200">{statsLine}</span>}
        </div>
        <p className="mt-2 text-[11px] text-gray-500">Daten von FuPa</p>
      </div>
    </div>
  )
}
