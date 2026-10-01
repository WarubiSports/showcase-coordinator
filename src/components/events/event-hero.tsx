import { Check, MapPin, Timer } from 'lucide-react'
import type { ShowcaseEvent } from '@/types'
import type { EventOverride, EventHero as EventHeroConfig } from '@/lib/event-overrides'

interface EventHeroProps {
  event: ShowcaseEvent
  hero: EventHeroConfig
  days?: EventOverride['days']
  earlyBirdPrice?: number
  slug: string
  accentColor: string
  daysAway: number
  canRegister: boolean
  onRegister: () => void
}

// Faint pitch markings behind the title
const PitchLines = () => (
  <svg
    className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-[900px] max-w-none opacity-[0.10] pointer-events-none"
    viewBox="0 0 900 1000"
    fill="none"
    stroke="white"
    strokeWidth="3"
    aria-hidden
  >
    <rect x="60" y="-40" width="780" height="1080" />
    <line x1="60" y1="420" x2="840" y2="420" />
    <circle cx="450" cy="420" r="130" />
    <circle cx="450" cy="420" r="6" fill="white" />
    <rect x="250" y="-40" width="400" height="200" />
    <rect x="350" y="-40" width="200" height="80" />
    <path d="M370 160 A 90 90 0 0 0 530 160" />
  </svg>
)

export const EventHero = ({
  event,
  hero,
  days,
  earlyBirdPrice,
  slug,
  accentColor,
  daysAway,
  canRegister,
  onRegister,
}: EventHeroProps) => {
  const currency = event.currency === 'EUR' ? '€' : '$'

  return (
    <header
      className="relative overflow-hidden text-white"
      style={{ background: `linear-gradient(180deg, ${accentColor} 0%, #8f0d14 42%, #2a070a 78%, #030712 100%)` }}
    >
      <PitchLines />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-5 pt-10 pb-14 sm:pt-14 sm:pb-20 text-center">
        {/* Partner lockup */}
        <div className="flex items-center justify-center gap-4">
          {hero.partnerLogos.map((logo, i) => (
            <div key={logo.src} className="flex items-center gap-4">
              {i > 0 && <span className="text-2xl font-light text-white/60">×</span>}
              <img src={logo.src} alt={logo.alt} className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]" />
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.3em] text-white/75">{hero.eyebrow}</p>

        {/* Title */}
        <h1 className="mt-4 text-[clamp(48px,15vw,104px)] font-black uppercase leading-[0.85] tracking-[-0.03em]">{hero.title}</h1>
        <p className="mt-2 text-xl sm:text-3xl font-black uppercase tracking-[0.12em] text-white/90">{hero.subtitle}</p>
        <p className="mt-3 text-base sm:text-lg italic font-semibold text-white/80">{hero.tagline}</p>

        {/* Day cards double as the boys/girls switch */}
        {days && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {days.map((day) => {
              const isCurrent = day.slug === slug
              return (
                <a
                  key={day.slug}
                  href={`/event/${day.slug}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`relative rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
                    isCurrent
                      ? 'bg-white text-gray-950 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
                      : 'bg-white/[0.08] text-white ring-1 ring-white/25 hover:bg-white/15'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: accentColor }}>
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="block text-xs font-black uppercase tracking-[0.2em]" style={isCurrent ? { color: accentColor } : undefined}>
                    {day.label}
                  </span>
                  <span className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black leading-none tracking-tight">{day.dateNum}</span>
                    <span className="text-sm font-bold uppercase">{day.month}</span>
                  </span>
                  <span className={`mt-1.5 block text-[11px] font-medium ${isCurrent ? 'text-gray-500' : 'text-white/70'}`}>{day.detail}</span>
                </a>
              )
            })}
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-white/75">
          <MapPin className="h-4 w-4 shrink-0" />
          {event.location.replace(/, Field \d+/, '')}
        </p>

        {/* Price + CTA */}
        {event.price && (
          <div className="mt-8 flex items-end justify-center gap-5">
            {earlyBirdPrice ? (
              <>
                <div className="text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">Early bird</span>
                  <span className="block text-5xl font-black leading-none">{currency}{earlyBirdPrice}</span>
                </div>
                <div className="text-left pb-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Regular</span>
                  <span className="block text-2xl font-black leading-none text-white/60">{currency}{event.price}</span>
                </div>
              </>
            ) : (
              <span className="text-5xl font-black leading-none">{currency}{event.price}</span>
            )}
          </div>
        )}

        {canRegister && (
          <button
            onClick={onRegister}
            className="mt-6 w-full rounded-2xl bg-white py-4 text-lg font-black uppercase tracking-wider shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all hover:brightness-95 active:scale-[0.98]"
            style={{ color: accentColor }}
          >
            Register now
          </button>
        )}

        {daysAway > 0 && daysAway <= 120 && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            <Timer className="h-3.5 w-3.5" />
            {daysAway === 1 ? 'Tomorrow' : `${daysAway} days to go`}
          </p>
        )}
      </div>
    </header>
  )
}
