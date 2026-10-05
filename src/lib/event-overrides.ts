// Per-event extras for public event pages that the showcase_events table has no columns for.
// Keyed by event slug. Events without an entry render exactly as before.

export interface EventDayLink {
  label: string
  dateNum: string
  month: string
  detail: string
  slug: string
}

// Presence of a hero config switches the event to the light club-style landing page
export interface EventHero {
  kicker: string
  title: string
  intro: string
  partnerLogos: { src: string; alt: string }[]
  // Muted background loop behind the header (shown as a red duotone)
  video?: { src: string; poster: string }
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

export interface EventPayment {
  label: string
  url: string
}

export interface EventOverride {
  earlyBirdPrice?: number
  // ISO date (inclusive); early-bird price is shown until then
  earlyBirdUntil?: string
  payment?: EventPayment
  days?: EventDayLink[]
  highlights?: EventHighlight[]
  contact?: EventContact
  presentedBy?: string
  hero?: EventHero
  // Venue UTC offset for calendar links and date cut-offs, e.g. '-10:00'
  utcOffset?: string
}

const HAWAII_808_2026: EventOverride = {
  earlyBirdPrice: 50,
  earlyBirdUntil: '2026-10-31',
  payment: { label: 'Venmo @Fabian-Rummel', url: 'https://venmo.com/u/Fabian-Rummel' },
  utcOffset: '-10:00',
  days: [
    { label: 'Boys', dateNum: '20', month: 'Dec', detail: 'Field 9 · 9 AM to 12 PM', slug: '808-showcase-boys' },
    { label: 'Girls', dateNum: '21', month: 'Dec', detail: 'Field 6 · 9 AM to 12 PM', slug: '808-showcase-girls' },
  ],
  hero: {
    kicker: '808 Futbol Club · Waipahu, Hawaii',
    title: 'Showcase & College ID Camp',
    intro: 'Find your own path. One morning in front of college coaches and 1.FC Köln ITP scouts, with small-sided games and performance testing.',
    partnerLogos: [
      { src: '/events/808/808-crest.png', alt: '808 Futbol Club' },
      { src: '/events/808/fc-koeln-football-school.png', alt: '1.FC Köln Football School' },
    ],
    // 1.FC Köln ITP vs Preussen Bonn, 25.10.2025 (Elements: Training & Matchday/Oktober 2025, C0443 12.4-18.0 s)
    video: { src: '/events/808/hero-loop.mp4', poster: '/events/808/hero-poster.jpg' },
  },
  highlights: [
    { title: 'College Coaches', desc: 'Play in front of college coaches, with more programs to be announced' },
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

// Early-bird price while it applies (no end date = always)
export const activeEarlyBird = (extras: EventOverride, now = new Date()): number | undefined => {
  if (!extras.earlyBirdPrice) return undefined
  if (!extras.earlyBirdUntil) return extras.earlyBirdPrice
  return now <= earlyBirdEnd(extras) ? extras.earlyBirdPrice : undefined
}

const earlyBirdEnd = (extras: EventOverride) => new Date(`${extras.earlyBirdUntil}T23:59:59${extras.utcOffset ?? 'Z'}`)

// Whole days left in the early-bird window (0 when there is none)
export const earlyBirdDaysLeft = (extras: EventOverride, now = new Date()): number => {
  if (!extras.earlyBirdUntil || !activeEarlyBird(extras, now)) return 0
  return Math.max(1, Math.ceil((earlyBirdEnd(extras).getTime() - now.getTime()) / 86_400_000))
}

const formatUntil = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// "$60, early bird $50 until Oct 31" style price line
export const priceLine = (price: number, currency: string, extras: EventOverride, now = new Date()): string => {
  const cur = currency === 'EUR' ? '€' : '$'
  const eb = activeEarlyBird(extras, now)
  if (!eb) return `${cur}${price}`
  return `${cur}${price}, early bird ${cur}${eb}${extras.earlyBirdUntil ? ` until ${formatUntil(extras.earlyBirdUntil)}` : ''}`
}
