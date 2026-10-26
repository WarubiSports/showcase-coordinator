import type { InvitePayload } from '@/components/invite/invite-types'
import { careerLine, seasonLine } from '@/lib/card-lines'
import { clubCrest } from '@/lib/club-crest'

// Player card above the event facts: FuPa data the server read for the invite, or Base's photo, club and
// position for a linked athlete until then. Rendered when there is a photo or a club; otherwise nothing extra.
export const hasPlayerCard = (invite: InvitePayload['invite']): boolean => !!(invite.photo_url || invite.club)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export const PlayerCard = ({ invite }: { invite: InvitePayload['invite'] }) => {
  // Zero counts are left out, a season or career without games has no line
  const statsLine = seasonLine(invite.stats)
  const career = careerLine(invite.stats?.career)
  const crest = clubCrest(invite)
  return (
    <div className="flex gap-4 rounded-xl border border-ausa-ink-200 bg-ausa-paper p-4 text-ausa-ink-900 shadow-[0_1px_0_rgba(11,15,23,0.04)]">
      {invite.photo_url ? (
        // FuPa serves the photo from image.fupa.net; next/image would need that host allow-listed
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invite.photo_url} alt="" className="h-28 w-[88px] shrink-0 rounded-lg bg-ausa-ink-100 object-cover object-top" />
      ) : crest ? (
        // A crest is not a portrait: same frame, light paper, padding, nothing cropped
        <div className="grid h-28 w-[88px] shrink-0 place-items-center rounded-lg border border-ausa-ink-200 bg-ausa-paper p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={crest} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div className="grid h-28 w-[88px] shrink-0 place-items-center rounded-lg bg-ausa-ink-100 font-ausa-display text-2xl font-semibold text-ausa-ink-400">{initials(invite.name)}</div>
      )}
      <div className="min-w-0 self-center">
        <p className="font-ausa-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ausa-accent">Athletes USA Auswahl</p>
        <p className="truncate font-ausa-display text-xl font-semibold leading-tight">{invite.name}</p>
        {invite.club && <p className="mt-0.5 break-words text-sm text-ausa-ink-500">{invite.club}</p>}
        {invite.league && <p className="text-sm text-ausa-ink-500">{invite.league}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {invite.position && <span className="rounded-md bg-ausa-ink-100 px-2 py-0.5 font-medium text-ausa-ink-900">{invite.position}</span>}
          {statsLine && <span className="font-ausa-mono text-xs text-ausa-ink-700">{statsLine}</span>}
        </div>
        {career && <p className="mt-1 font-ausa-mono text-xs text-ausa-ink-700">{career}</p>}
        {/* Where the card's data comes from; a club typed by staff for a player in neither has no source line */}
        {(invite.enriched_at || invite.ausa_athlete_id) && (
          <p className="mt-2 text-[11px] text-ausa-ink-400">{invite.enriched_at ? 'Daten von FuPa' : 'Daten aus deinem Athletes USA Profil'}</p>
        )}
      </div>
    </div>
  )
}
