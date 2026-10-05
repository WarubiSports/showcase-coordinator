import type { PlayerPosition } from '@/types'

// Spots on a vertical pitch, attacking upwards (x/y in % of the pitch box)
const SPOTS: { value: PlayerPosition; label: string; x: number; y: number }[] = [
  { value: 'ST', label: 'Striker', x: 50, y: 13 },
  { value: 'LW', label: 'Left Wing', x: 17, y: 22 },
  { value: 'RW', label: 'Right Wing', x: 83, y: 22 },
  { value: 'CAM', label: 'Attacking Mid', x: 50, y: 33 },
  { value: 'CM', label: 'Central Mid', x: 50, y: 48 },
  { value: 'CDM', label: 'Defensive Mid', x: 50, y: 62 },
  { value: 'LB', label: 'Left Back', x: 15, y: 70 },
  { value: 'RB', label: 'Right Back', x: 85, y: 70 },
  { value: 'CB', label: 'Center Back', x: 50, y: 77 },
  { value: 'GK', label: 'Goalkeeper', x: 50, y: 92 },
]

interface PositionPitchProps {
  value: PlayerPosition | ''
  onChange: (value: PlayerPosition | '') => void
  accentColor: string
}

// Tap-your-position picker; tapping the selected spot again clears it
export const PositionPitch = ({ value, onChange, accentColor }: PositionPitchProps) => {
  const selected = SPOTS.find((s) => s.value === value)

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-md bg-[#1f7a3f]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 400" fill="none" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="0" y={i * 80} width="300" height="40" fill="white" opacity="0.05" />
          ))}
          <g stroke="white" strokeOpacity="0.7" strokeWidth="2">
            <rect x="12" y="12" width="276" height="376" />
            <line x1="12" y1="200" x2="288" y2="200" />
            <circle cx="150" cy="200" r="38" />
            <rect x="80" y="12" width="140" height="58" />
            <rect x="80" y="330" width="140" height="58" />
            <rect x="120" y="12" width="60" height="22" />
            <rect x="120" y="366" width="60" height="22" />
          </g>
        </svg>
        {SPOTS.map((spot) => {
          const isOn = spot.value === value
          return (
            <button
              key={spot.value}
              type="button"
              aria-label={spot.label}
              aria-pressed={isOn}
              onClick={() => onChange(isOn ? '' : spot.value)}
              className={`absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold transition-transform active:scale-90 ${
                isOn ? 'scale-110 text-white ring-2 ring-white' : 'bg-white/90 text-gray-900 hover:bg-white'
              }`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, ...(isOn ? { backgroundColor: accentColor } : {}) }}
            >
              {spot.value}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-sm text-gray-600" aria-live="polite">
        {selected ? (
          <>
            Position: <span className="font-semibold text-gray-950">{selected.label}</span>
          </>
        ) : (
          'Tap where you play'
        )}
      </p>
    </div>
  )
}
