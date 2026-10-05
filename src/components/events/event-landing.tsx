import { useEffect, useRef } from 'react'
import { Barlow_Condensed } from 'next/font/google'
import { CalendarPlus, Check, MessageCircle, Timer } from 'lucide-react'
import type { EventScout, ShowcaseEvent } from '@/types'
import { activeEarlyBird, earlyBirdDaysLeft, priceLine, type EventHero, type EventOverride } from '@/lib/event-overrides'
import { RegistrationForm, type RegistrationFormProps } from '@/components/events/registration-form'

const display = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800'] })

interface EventLandingProps {
  event: ShowcaseEvent
  scouts: EventScout[]
  extras: EventOverride & { hero: EventHero }
  slug: string
  accentColor: string
  mapEmbedUrl: string | null
  canRegister: boolean
  closedLabel: string
  showForm: boolean
  showSticky: boolean
  // Shared multi-day link: no day selected yet, registering starts by picking one
  isAlias: boolean
  daysAway: number
  onRegister: () => void
  formProps: Omit<RegistrationFormProps, 'variant' | 'accentColor'>
}

const currencySymbol = (currency: string) => (currency === 'EUR' ? '€' : '$')

// Accent focus ring + fade-in used by the light form
const LandingStyles = ({ accentColor }: { accentColor: string }) => (
  <style>{`
    .accent-focus:focus, .accent-focus:focus-visible { box-shadow: 0 0 0 2px ${accentColor}; border-color: transparent; }
    @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-up { animation: fade-up 0.3s ease-out; }
    @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .ticker { animation: ticker 28s linear infinite; }
    @media (prefers-reduced-motion: reduce) { .ticker { animation: none; } }
  `}</style>
)

const ClubBar = ({ hero }: { hero: EventHero }) => (
  <div className="border-b border-gray-200 bg-white">
    <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-3">
      {hero.partnerLogos.map((logo) => (
        <img key={logo.src} src={logo.src} alt={logo.alt} className="h-10 w-auto object-contain" />
      ))}
    </div>
  </div>
)

// Muted match loop as a red duotone; stays on the poster frame for reduced-motion users
const HeroVideo = ({ video, accentColor }: { video: NonNullable<EventHero['video']>; accentColor: string }) => {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current?.pause()
  }, [])
  return (
    <div className="absolute inset-0" aria-hidden>
      <video
        ref={ref}
        className="h-full w-full object-cover grayscale contrast-125"
        src={video.src}
        poster={video.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 opacity-[0.62]" style={{ backgroundColor: accentColor }} />
    </div>
  )
}

// Big "Boys · Dec 20" style buttons that take the visitor to that day's registration
const DayButtons = ({ days, accentColor, hrefFor, dark }: {
  days: NonNullable<EventOverride['days']>
  accentColor: string
  hrefFor: (slug: string) => string
  dark?: boolean
}) => (
  <div className="grid grid-cols-2 gap-2">
    {days.map((day) => (
      <a
        key={day.slug}
        href={hrefFor(day.slug)}
        className={`rounded-md px-4 py-3 text-center font-bold ${dark ? 'text-white' : 'bg-white'}`}
        style={dark ? { backgroundColor: accentColor } : { color: accentColor }}
      >
        {day.label} · {day.month} {day.dateNum}
      </a>
    ))}
  </div>
)

// Light, club-style landing page for partner events (enabled via a hero config in event-overrides)
export const EventLanding = ({
  event,
  scouts,
  extras,
  slug,
  accentColor,
  mapEmbedUrl,
  canRegister,
  closedLabel,
  showForm,
  showSticky,
  isAlias,
  daysAway,
  onRegister,
  formProps,
}: EventLandingProps) => {
  const { hero, days, highlights, contact, presentedBy, payment } = extras
  const earlyBird = activeEarlyBird(extras)
  const earlyBirdDays = earlyBirdDaysLeft(extras)
  const cur = currencySymbol(event.currency)
  const h2 = `${display.className} text-[32px] font-bold uppercase leading-none text-gray-950`
  const dayHref = (daySlug: string) => `/event/${daySlug}${isAlias ? '?register=1' : ''}`
  const location = isAlias ? event.location.replace(/, Field \d+/, '') : event.location

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <LandingStyles accentColor={accentColor} />
      <ClubBar hero={hero} />

      {/* Header: matchday-poster style */}
      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: accentColor, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 28px), 0 100%)' }}
      >
        {hero.video ? (
          <HeroVideo video={hero.video} accentColor={accentColor} />
        ) : (
          <span
            aria-hidden
            className={`${display.className} pointer-events-none absolute -right-6 top-6 select-none text-[220px] sm:text-[300px] font-extrabold leading-none text-transparent`}
            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.14)' }}
          >
            808
          </span>
        )}
        <div className="relative max-w-3xl mx-auto px-5 pt-7 pb-14">
          <p className="text-sm font-semibold text-white/85">{hero.kicker}</p>
          <h1 className={`${display.className} mt-1 uppercase`}>
            <span className="block text-[clamp(64px,23vw,168px)] font-extrabold leading-[0.82] tracking-[-0.01em]">Showcase</span>
            <span className="mt-1 block text-[clamp(28px,8.6vw,54px)] font-bold leading-none">&amp; College ID Camp</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/90">{hero.intro}</p>

          {days && (
            <div className="mt-7 grid grid-cols-2 gap-2" role="tablist">
              {days.map((day) => {
                const isCurrent = day.slug === slug
                return (
                  <a
                    key={day.slug}
                    href={dayHref(day.slug)}
                    role="tab"
                    aria-selected={isCurrent}
                    className={`rounded-md px-4 py-3 ${isCurrent || isAlias ? 'bg-white text-gray-950 hover:bg-gray-100' : 'bg-black/15 text-white hover:bg-black/25'}`}
                  >
                    <span className={`${display.className} block text-[22px] font-bold uppercase leading-none`} style={isCurrent || isAlias ? { color: accentColor } : undefined}>
                      {day.label}
                    </span>
                    <span className={`${display.className} mt-1 block text-[40px] font-extrabold uppercase leading-none`}>
                      {day.month} {day.dateNum}
                    </span>
                    <span className={`mt-1.5 block text-xs font-medium ${isCurrent || isAlias ? 'text-gray-500' : 'text-white/75'}`}>{day.detail}</span>
                    {isAlias && <span className="mt-2 block text-sm font-bold" style={{ color: accentColor }}>Register →</span>}
                  </a>
                )
              })}
            </div>
          )}

          <dl className="mt-6 space-y-1.5 text-[15px] leading-snug">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 font-semibold">Where</dt>
              <dd className="text-white/90">{location}</dd>
            </div>
            {event.price && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 font-semibold">Entry</dt>
                <dd className="text-white/90">
                  {priceLine(event.price, event.currency, extras)}
                  {payment && (
                    <span className="block">
                      Pay via{' '}
                      <a href={payment.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-2">
                        {payment.label}
                      </a>
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {canRegister && earlyBirdDays > 0 && (
            <p className="mt-7 flex items-center gap-1.5 text-sm font-semibold">
              <Timer className="h-4 w-4" />
              Early bird ends in {earlyBirdDays} {earlyBirdDays === 1 ? 'day' : 'days'}
            </p>
          )}

          {canRegister && isAlias && (
            <p className={`${display.className} ${earlyBirdDays > 0 ? 'mt-3' : 'mt-8'} text-[24px] font-bold uppercase leading-none`}>
              Tap your day above to register
            </p>
          )}

          {canRegister && !isAlias && (
            <button
              onClick={onRegister}
              className={`${display.className} ${earlyBirdDays > 0 ? 'mt-3' : 'mt-8'} w-full sm:w-auto rounded-md bg-white px-10 py-3 text-[26px] font-bold uppercase leading-none hover:bg-gray-100`}
              style={{ color: accentColor }}
            >
              Register now
            </button>
          )}
        </div>
      </section>

      {/* Ticker */}
      {highlights && (
        <div className="-mt-3 overflow-hidden bg-gray-950 py-3 text-white" aria-hidden>
          <div className="ticker flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className={`${display.className} flex shrink-0 items-center text-[22px] font-bold uppercase`}>
                {[...highlights.map((h) => h.title), ...(daysAway > 0 ? [`${daysAway} days to go`] : [])].map((item, i) => (
                  <span key={`${copy}-${i}`} className="flex items-center">
                    <span className="px-5">{item}</span>
                    <span style={{ color: accentColor }}>/</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-5">
        {highlights && (
          <section className="py-10 border-b border-gray-200">
            <h2 className={h2}>What to expect</h2>
            <ul className="mt-6 space-y-5">
              {highlights.map((item, i) => (
                <li key={item.title} className="flex gap-4">
                  <span className={`${display.className} w-10 shrink-0 text-[40px] font-extrabold leading-[0.85]`} style={{ color: accentColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[17px] font-semibold">{item.title}</p>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {scouts.length > 0 && (
          <section className="py-10 border-b border-gray-200">
            <h2 className={h2}>Who&apos;s coming</h2>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-7">
              {scouts.map((scout) => (
                <div key={scout.id}>
                  {scout.logo_url && <img src={scout.logo_url} alt={scout.organization || scout.name} className="h-16 w-16 object-contain" />}
                  <p className="mt-2 text-sm font-semibold">{scout.name}</p>
                  {scout.organization && <p className="text-xs text-gray-500">{scout.organization}</p>}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-gray-500">More college coaches to be announced.</p>
          </section>
        )}

        <section className="py-10 border-b border-gray-200">
          <h2 className={h2}>Location</h2>
          <p className="mt-4">{event.location}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-semibold underline underline-offset-2"
            style={{ color: accentColor }}
          >
            Get directions
          </a>
          {mapEmbedUrl && (
            <div className="mt-5 h-56 sm:h-72 overflow-hidden rounded-md bg-gray-100">
              <iframe title="Venue map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapEmbedUrl} />
            </div>
          )}
        </section>

        <section className="py-10 border-b border-gray-200">
          {!canRegister ? (
            <>
              <h2 className={h2}>Registration</h2>
              <p className="mt-4 text-gray-600">{closedLabel}</p>
            </>
          ) : isAlias ? (
            <>
              <h2 className={h2}>Register</h2>
              <p className="mt-4 mb-5 text-gray-600">Pick your day. You&apos;ll get a confirmation by email.</p>
              {days && <DayButtons days={days} accentColor={accentColor} hrefFor={dayHref} dark />}
            </>
          ) : showForm ? (
            <RegistrationForm variant="light" accentColor={accentColor} {...formProps} />
          ) : (
            <>
              <h2 className={h2}>Register</h2>
              <p className="mt-4 text-gray-600">
                Sign up below. You&apos;ll get a confirmation by email.
              </p>
              <button onClick={onRegister} className="mt-5 w-full sm:w-auto rounded-md px-8 py-3.5 font-bold text-white" style={{ backgroundColor: accentColor }}>
                Register now
              </button>
            </>
          )}
        </section>

        {contact && (
          <section className="py-10">
            <h2 className={h2}>Questions?</h2>
            <p className="mt-4">
              {contact.name}, {contact.role}
            </p>
            <p className="mt-1 text-gray-600">
              <a href={`mailto:${contact.email}`} className="underline underline-offset-2">{contact.email}</a>
              {contact.phone && (
                <>
                  {' · '}
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="underline underline-offset-2">{contact.phone}</a>
                </>
              )}
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-5 py-6 pb-24 text-xs leading-relaxed text-gray-500">
          {presentedBy && <p>{presentedBy}</p>}
          <p className="mt-1">Registration by Warubi Sports</p>
        </div>
      </footer>

      {canRegister && !showForm && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}
        >
          {isAlias ? (
            <div className="max-w-3xl mx-auto">{days && <DayButtons days={days} accentColor={accentColor} hrefFor={dayHref} dark />}</div>
          ) : (
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm leading-tight">
              <span className="font-semibold">{days?.find((d) => d.slug === slug)?.label ?? event.name}</span>
              <span className="text-gray-500"> · {cur}{earlyBird ?? event.price}{earlyBird ? ' early bird' : ''}</span>
            </p>
            <button onClick={onRegister} className="rounded-md px-5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
              Register
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

interface EventLandingSuccessProps {
  event: ShowcaseEvent
  hero: EventHero
  utcOffset?: string
  accentColor: string
  email: string
  dateDisplay: string
  timeDisplay: string | null
  paymentNote: string | null
  shareUrl: string
}

const toCalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Google Calendar link + .ics file for the event (end defaults to 3 hours after start)
const calendarLinks = (event: ShowcaseEvent, utcOffset: string | undefined, url: string) => {
  const offset = utcOffset ?? 'Z'
  const start = new Date(`${event.start_date}T${event.start_time ?? '09:00'}${offset}`)
  const end = event.end_time
    ? new Date(`${event.end_date}T${event.end_time}${offset}`)
    : new Date(start.getTime() + 3 * 3_600_000)
  const details = `Register / details: ${url}`
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${toCalStamp(start)}/${toCalStamp(end)}&location=${encodeURIComponent(event.location)}&details=${encodeURIComponent(details)}`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Warubi Sports//Showcase//EN', 'BEGIN:VEVENT',
    `UID:${event.id}@showcase-coordinator`, `DTSTAMP:${toCalStamp(new Date())}`,
    `DTSTART:${toCalStamp(start)}`, `DTEND:${toCalStamp(end)}`,
    `SUMMARY:${event.name}`, `LOCATION:${event.location.replace(/,/g, '\\,')}`, `DESCRIPTION:${details}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` }
}

export const EventLandingSuccess = ({ event, hero, utcOffset, accentColor, email, dateDisplay, timeDisplay, paymentNote, shareUrl }: EventLandingSuccessProps) => {
  const cal = calendarLinks(event, utcOffset, shareUrl)
  const shareText = `${event.name}, ${dateDisplay} in ${event.location}. Register here: ${shareUrl}`
  return (
  <div className="min-h-screen bg-white text-gray-950">
    <ClubBar hero={hero} />
    <div className="max-w-xl mx-auto px-5 py-14">
      <div className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ backgroundColor: accentColor }}>
        <Check className="h-6 w-6" strokeWidth={3} />
      </div>
      <h1 className={`${display.className} mt-5 text-5xl font-extrabold uppercase leading-none`}>You&apos;re registered</h1>
      <p className="mt-4 text-gray-600">
        We sent a confirmation to <span className="font-semibold text-gray-950">{email}</span>.{paymentNote ? ` ${paymentNote}` : ''}
      </p>
      <div className="mt-6 rounded-md border border-gray-200 p-4 text-[15px] leading-relaxed">
        <p className="font-semibold">{event.name}</p>
        <p className="text-gray-600">{dateDisplay}{timeDisplay ? `, ${timeDisplay}` : ''}</p>
        <p className="text-gray-600">{event.location}</p>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <a
          href={cal.google}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to Google Calendar
        </a>
        <a
          href={cal.ics}
          download={`${event.slug}.ics`}
          className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
        >
          <CalendarPlus className="h-4 w-4" />
          Apple / Outlook calendar
        </a>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 rounded-md px-4 py-3.5 font-bold text-white"
        style={{ backgroundColor: accentColor }}
      >
        <MessageCircle className="h-5 w-5" />
        Send to a teammate
      </a>
    </div>
  </div>
  )
}
