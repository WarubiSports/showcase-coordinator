import { MATCH_LINE } from '@/lib/invite-og'
import { heroDateLine } from '@/lib/event-page'
import { MatchLockup } from '@/components/invite/match-lockup'
import type { InvitePayload } from '@/components/invite/invite-types'

// The event first: a landscape photo with the match on it. Until the event has its photo (public/events/<slug>/hero.jpg)
// the placeholder carries the lockup on paper fading into navy, so the layout is complete either way.
export const EventHero = ({ event }: { event: InvitePayload['event'] }) => (
  <div className="relative overflow-hidden rounded-2xl border border-ausa-ink-200 bg-ausa-ink-900" style={{ height: 'min(44vh, 360px)' }}>
    {event.hero_url ? (
      // The photo is a static file of this app; next/image would add nothing but a size requirement
      // eslint-disable-next-line @next/next/no-img-element
      <img src={event.hero_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-b from-ausa-paper via-ausa-ink-50 to-ausa-ink-900">
        <MatchLockup size="lg" className="absolute inset-x-0 top-[22%]" />
      </div>
    )}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ausa-ink-900 via-ausa-ink-900/85 to-transparent px-5 pb-5 pt-16 text-white">
      <p className="font-ausa-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ausa-accent-soft">Athletes USA Auswahl</p>
      <h1 className="mt-1 font-ausa-display text-2xl font-semibold leading-tight">{MATCH_LINE}</h1>
      <p className="mt-1 text-sm text-white/85">{heroDateLine(event)}</p>
    </div>
  </div>
)
