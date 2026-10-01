// Per-event extras for public event pages that the showcase_events table has no columns for.
// Keyed by event slug. Events without an entry render exactly as before.

export interface EventDayLink {
  label: string
  sublabel: string
  slug: string
}

export interface EventHighlight {
  title: string
  desc: string
}

export interface EventContact {
  name: string
  role: string
  email: string
  phone?: string
}

export interface EventOverride {
  earlyBirdPrice?: number
  days?: EventDayLink[]
  highlights?: EventHighlight[]
  contact?: EventContact
  presentedBy?: string
}

const HAWAII_808_2026: EventOverride = {
  earlyBirdPrice: 40,
  days: [
    { label: 'Boys', sublabel: 'Dec 20', slug: '808-showcase-boys' },
    { label: 'Girls', sublabel: 'Dec 21', slug: '808-showcase-girls' },
  ],
  highlights: [
    { title: 'College Coaches', desc: 'Play in front of college coaches from Hawaii Pacific, Chaminade and UH Hilo, with more to come' },
    { title: '1.FC Köln ITP Scouts', desc: 'Direct exposure to scouts from the Bundesliga club’s International Talent Program' },
    { title: 'Playing Games', desc: 'Small-sided games, so coaches see you in real game situations' },
    { title: 'Performance Testing', desc: 'Athletic performance testing on site' },
  ],
  contact: {
    name: 'Fabian Rummel',
    role: 'Director of Coaching, 808 Futbol Club',
    email: 'director@808futbolclub.com',
    phone: '(319) 283-8508',
  },
  presentedBy: 'Presented by 808 Futbol Club, in partnership with the 1.FC Köln Bundesliga International Talent Program & Warubi Sports',
}

const EVENT_OVERRIDES: Record<string, EventOverride> = {
  '808-showcase-boys': HAWAII_808_2026,
  '808-showcase-girls': HAWAII_808_2026,
}

export const getEventOverride = (slug: string): EventOverride => EVENT_OVERRIDES[slug] ?? {}
