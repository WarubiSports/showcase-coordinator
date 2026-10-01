// Per-event extras for public event pages that the showcase_events table has no columns for.
// Keyed by event slug. Events without an entry render exactly as before.

export interface EventDayLink {
  label: string
  dateNum: string
  month: string
  detail: string
  slug: string
}

export interface EventHero {
  eyebrow: string
  title: string
  subtitle: string
  tagline: string
  partnerLogos: { src: string; alt: string }[]
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
  hero?: EventHero
}

const HAWAII_808_2026: EventOverride = {
  earlyBirdPrice: 40,
  days: [
    { label: 'Boys', dateNum: '20', month: 'Dec', detail: 'Field 9 · 9 AM to 12 PM', slug: '808-showcase-boys' },
    { label: 'Girls', dateNum: '21', month: 'Dec', detail: 'Field 6 · 9 AM to 12 PM', slug: '808-showcase-girls' },
  ],
  hero: {
    eyebrow: '808 Futbol Club × 1.FC Köln Football School',
    title: 'Showcase',
    subtitle: 'College ID Camp',
    tagline: 'Find your own path.',
    partnerLogos: [
      { src: '/events/808/808-crest.png', alt: '808 Futbol Club' },
      { src: '/events/808/fc-koeln-football-school.png', alt: '1.FC Köln Football School' },
    ],
  },
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
